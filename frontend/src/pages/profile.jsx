/* eslint-disable no-unused-vars */
// src/pages/profile.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import Navbar from "../components/navbarsponhome";
import Footer from "../components/footer";
import {
  Camera,
  Plus,
  X,
  Save,
  Mail,
  Tag,
  FolderOpen,
  Loader2,
  Link as LinkIcon,
  Briefcase,
  Cpu,
  GraduationCap,
  CalendarDays,
  Building2,
} from "lucide-react";
import { apiFetch } from "../lib/fetch";
import { safeExternalOpen, safeHttpUrl, safeMediaUrl, safeSlug } from "../utils/safeUrl";

const API_BASE = import.meta.env?.VITE_API_BASE || "http://localhost:5000";

const GradientText = ({ children, className = "" }) => (
  <span className={`text-blue-700 font-bold tracking-tight ${className}`}>
    {children}
  </span>
);

const NeonButton = ({ children, className = "", loading = false, ...props }) => (
  <button
    {...props}
    disabled={loading || props.disabled}
    className={`relative inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-white transition-all duration-200 bg-blue-600 hover:bg-blue-700 shadow-sm hover:shadow-md active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed ${className}`}
  >
    {loading && <Loader2 className="h-4 w-4 animate-spin" />}
    <span>{children}</span>
  </button>
);

const GlassCard = ({ children, className = "" }) => (
  <div className={`rounded-xl border border-slate-200 bg-white shadow-sm ${className}`}>
    {children}
  </div>
);

const SkillPill = ({ text, onRemove }) => (
  <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm text-slate-700 font-medium">
    <Tag className="h-3.5 w-3.5 text-slate-400" />
    {text}
    <button
      className="ml-1 opacity-60 hover:opacity-100 text-slate-500 hover:text-red-500"
      onClick={onRemove}
      type="button"
      aria-label="Remove skill"
    >
      <X className="h-3.5 w-3.5" />
    </button>
  </span>
);

// Media preview for images/videos
const MediaThumb = ({ file, url, onRemove }) => {
  const isVideo = useMemo(() => {
    const type = file?.type || "";
    return type.startsWith("video/");
  }, [file]);

  return (
    <div className="relative w-24 h-24 rounded-lg overflow-hidden border border-slate-200 bg-slate-50 group">
      {isVideo ? (
        <video src={url} className="w-full h-full object-cover" muted controls={false} />
      ) : (
        <img src={url} className="w-full h-full object-cover" alt="Preview" />
      )}
      <button
        type="button"
        className="absolute top-1 right-1 bg-white/90 text-slate-600 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white hover:text-red-500 shadow-sm"
        onClick={onRemove}
        aria-label="Remove file"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
};

const DOMAIN_OPTIONS = [
  { key: "tech", label: "Technology", icon: Cpu, color: "text-blue-600 bg-blue-50 border-blue-100", stackLabel: "Primary Stack" },
  { key: "education", label: "Education", icon: GraduationCap, color: "text-amber-700 bg-amber-50 border-amber-100", stackLabel: "Formats / Methods" },
  { key: "event", label: "Event", icon: CalendarDays, color: "text-purple-700 bg-purple-50 border-purple-100", stackLabel: "Event Types" },
  { key: "architecture", label: "Architecture", icon: Building2, color: "text-emerald-700 bg-emerald-50 border-emerald-100", stackLabel: "Software / Tooling" },
];

const EXPERTISE_VALUES = ["starter", "intermediate", "advanced", "expert"];
const AVAILABILITY_VALUES = ["open", "limited", "booked", "not-looking"];

const splitCsv = (value) =>
  String(value || "")
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);

const toCsv = (value) => (Array.isArray(value) ? value.join(", ") : "");

const fieldPathToId = (path) => {
  const joined = Array.isArray(path) ? path.join(".") : String(path || "");
  const direct = {
    name: "profile-name",
    bio: "profile-bio",
    skills: "profile-skillInput",
    "professionalProfile.headline": "profile-headline",
    "professionalProfile.valueProposition": "profile-valueProposition",
    "professionalProfile.expertiseLevel": "profile-expertiseLevel",
    "professionalProfile.yearsExperience": "profile-yearsExperience",
    "professionalProfile.availability": "profile-availability",
    "professionalProfile.responseSla": "profile-responseSla",
    "professionalProfile.domains": "domain-selector",
  };
  if (direct[joined]) return direct[joined];
  if (/^skills(?:\.\d+)?$/.test(joined)) return "profile-skillInput";
  if (/^professionalProfile\.domains(?:\.\d+)?$/.test(joined)) return "domain-selector";

  const domainMatch = joined.match(
    /^professionalProfile\.domainDetails\.(tech|education|event|architecture)\.(focusAreas|primaryStack|deliverables|proofPoints)(?:\.\d+)?$/
  );
  if (domainMatch) {
    return `domain-${domainMatch[1]}-${domainMatch[2]}`;
  }
  return null;
};

const friendlyValidationMessage = (issue, fieldId) => {
  const message = String(issue?.message || "Invalid value.");
  const maximum = Number(issue?.maximum);
  const minimum = Number(issue?.minimum);

  if (fieldId?.startsWith("domain-")) {
    if (issue?.code === "too_big" && Number.isFinite(maximum)) {
      return `Use comma-separated values, each entry must be under ${maximum} characters.`;
    }
    if (issue?.code === "too_small" && Number.isFinite(minimum)) {
      return `Use comma-separated values, each entry should be at least ${minimum} characters.`;
    }
  }

  if (fieldId === "profile-skillInput") {
    if (issue?.code === "too_big" && Number.isFinite(maximum)) {
      return `Each skill should be under ${maximum} characters.`;
    }
    return "Please keep skills short and comma-style simple.";
  }

  if (fieldId === "profile-name") {
    if (issue?.code === "too_small" && Number.isFinite(minimum)) {
      return `Display name should be at least ${minimum} characters.`;
    }
    if (issue?.code === "too_big" && Number.isFinite(maximum)) {
      return `Display name should be under ${maximum} characters.`;
    }
  }

  if (fieldId === "profile-yearsExperience") {
    return "Years of experience must be a number between 0 and 60.";
  }

  return message;
};

const createProfessionalState = (raw = {}) => {
  const p = raw && typeof raw === "object" ? raw : {};
  const dd = p.domainDetails && typeof p.domainDetails === "object" ? p.domainDetails : {};
  const readDomain = (k) => {
    const d = dd[k] && typeof dd[k] === "object" ? dd[k] : {};
    return {
      focusAreas: toCsv(d.focusAreas),
      primaryStack: toCsv(d.primaryStack),
      deliverables: toCsv(d.deliverables),
      proofPoints: String(d.proofPoints || ""),
    };
  };

  return {
    headline: String(p.headline || ""),
    valueProposition: String(p.valueProposition || ""),
    expertiseLevel: EXPERTISE_VALUES.includes(String(p.expertiseLevel || "")) ? String(p.expertiseLevel) : "",
    yearsExperience: p.yearsExperience != null ? String(p.yearsExperience) : "",
    availability: AVAILABILITY_VALUES.includes(String(p.availability || "")) ? String(p.availability) : "open",
    responseSla: String(p.responseSla || ""),
    domains: Array.isArray(p.domains) ? p.domains : [],
    serviceLines: toCsv(p.serviceLines),
    toolsAndStack: toCsv(p.toolsAndStack),
    engagementModes: toCsv(p.engagementModes),
    certifications: toCsv(p.certifications),
    achievements: toCsv(p.achievements),
    portfolioHighlights: toCsv(p.portfolioHighlights),
    domainDetails: {
      tech: readDomain("tech"),
      education: readDomain("education"),
      event: readDomain("event"),
      architecture: readDomain("architecture"),
    },
  };
};

const professionalToPayload = (state) => ({
  headline: String(state.headline || "").trim(),
  valueProposition: String(state.valueProposition || "").trim(),
  expertiseLevel: state.expertiseLevel ? String(state.expertiseLevel).trim() : undefined,
  yearsExperience: state.yearsExperience === "" ? undefined : Number(state.yearsExperience),
  availability: state.availability ? String(state.availability).trim() : undefined,
  responseSla: String(state.responseSla || "").trim(),
  domains: Array.isArray(state.domains) ? state.domains : [],
  domainDetails: {
    tech: {
      focusAreas: splitCsv(state.domainDetails?.tech?.focusAreas),
      primaryStack: splitCsv(state.domainDetails?.tech?.primaryStack),
      deliverables: splitCsv(state.domainDetails?.tech?.deliverables),
      proofPoints: String(state.domainDetails?.tech?.proofPoints || "").trim(),
    },
    education: {
      focusAreas: splitCsv(state.domainDetails?.education?.focusAreas),
      primaryStack: splitCsv(state.domainDetails?.education?.primaryStack),
      deliverables: splitCsv(state.domainDetails?.education?.deliverables),
      proofPoints: String(state.domainDetails?.education?.proofPoints || "").trim(),
    },
    event: {
      focusAreas: splitCsv(state.domainDetails?.event?.focusAreas),
      primaryStack: splitCsv(state.domainDetails?.event?.primaryStack),
      deliverables: splitCsv(state.domainDetails?.event?.deliverables),
      proofPoints: String(state.domainDetails?.event?.proofPoints || "").trim(),
    },
    architecture: {
      focusAreas: splitCsv(state.domainDetails?.architecture?.focusAreas),
      primaryStack: splitCsv(state.domainDetails?.architecture?.primaryStack),
      deliverables: splitCsv(state.domainDetails?.architecture?.deliverables),
      proofPoints: String(state.domainDetails?.architecture?.proofPoints || "").trim(),
    },
  },
});

export default function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [avatarSaving, setAvatarSaving] = useState(false);
  const [projectSaving, setProjectSaving] = useState(false);
  const [err, setErr] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  // Core profile fields
  const [user, setUser] = useState(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState(""); // read-only from backend (auth identity)
  const [skills, setSkills] = useState([]);
  const [skillInput, setSkillInput] = useState("");

  // NEW: Bio
  const [bio, setBio] = useState("");
  const [professional, setProfessional] = useState(() => createProfessionalState());

  // Avatar
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [avatarFile, setAvatarFile] = useState(null);
  const avatarInputRef = useRef(null);

  // Portfolio projects (editor; max 3)
  const [projects, setProjects] = useState([]);
  // Saved projects coming from server (read-only list)
  const [savedProjects, setSavedProjects] = useState([]);

  // Edit helpers
  const [editingIndex, setEditingIndex] = useState(null);
  const editorRef = useRef(null);
  const scrollToEditor = () => {
    editorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const projectLimits = {
    free: 3,
    plus: 5,
    ultra: 10,
  };

  const maxProjects = projectLimits[user?.plan || "free"];

  const clearFieldError = (fieldId) => {
    if (!fieldId) return;
    setFieldErrors((prev) => {
      if (!prev[fieldId]) return prev;
      const next = { ...prev };
      delete next[fieldId];
      return next;
    });
  };

  const setProfessionalField = (field, value) => {
    setProfessional((prev) => ({ ...prev, [field]: value }));
    const map = {
      headline: "profile-headline",
      valueProposition: "profile-valueProposition",
      expertiseLevel: "profile-expertiseLevel",
      yearsExperience: "profile-yearsExperience",
      availability: "profile-availability",
      responseSla: "profile-responseSla",
    };
    clearFieldError(map[field]);
  };

  const toggleDomain = (domainKey) => {
    setProfessional((prev) => {
      const exists = prev.domains.includes(domainKey);
      return {
        ...prev,
        domains: exists ? prev.domains.filter((d) => d !== domainKey) : [...prev.domains, domainKey],
      };
    });
    clearFieldError("domain-selector");
  };

  const setDomainField = (domainKey, field, value) => {
    setProfessional((prev) => ({
      ...prev,
      domainDetails: {
        ...prev.domainDetails,
        [domainKey]: {
          ...(prev.domainDetails?.[domainKey] || {}),
          [field]: value,
        },
      },
    }));
    clearFieldError(`domain-${domainKey}-${field}`);
  };

  const selectedDomainOptions = DOMAIN_OPTIONS.filter((d) =>
    professional.domains.includes(d.key)
  );

  const focusField = (id) => {
    if (!id) return;
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    setTimeout(() => {
      if (typeof el.focus === "function") el.focus();
    }, 80);
  };

  const setValidationErrors = (errorsMap) => {
    setFieldErrors(errorsMap || {});
    const firstId = Object.keys(errorsMap || {})[0];
    if (firstId) focusField(firstId);
  };

  const validateCsvField = (value, maxItems, maxLength, fieldId, label, errors) => {
    const items = splitCsv(value);
    if (items.length > maxItems) {
      errors[fieldId] = `${label}: use up to ${maxItems} comma-separated entries.`;
      return;
    }
    const tooLong = items.find((item) => item.length > maxLength);
    if (tooLong) {
      errors[fieldId] = `${label}: keep each comma-separated entry under ${maxLength} characters.`;
    }
  };

  const validateProfileForm = () => {
    const errors = {};

    const trimmedName = String(name || "").trim();
    if (trimmedName.length < 2) errors["profile-name"] = "At least 2 characters required.";
    if (trimmedName.length > 40) errors["profile-name"] = "Maximum 40 characters allowed.";

    if ((skills || []).length > 20) {
      errors["profile-skillInput"] = "Use up to 20 skills.";
    }
    const longSkill = (skills || []).find((s) => String(s || "").trim().length > 32);
    if (longSkill) {
      errors["profile-skillInput"] = "Each skill must be under 32 characters.";
    }

    if (String(professional.headline || "").length > 140) {
      errors["profile-headline"] = "Maximum 140 characters allowed.";
    }
    if (String(professional.valueProposition || "").length > 280) {
      errors["profile-valueProposition"] = "Maximum 280 characters allowed.";
    }
    if (String(professional.responseSla || "").length > 64) {
      errors["profile-responseSla"] = "Maximum 64 characters allowed.";
    }
    if (String(bio || "").length > 300) {
      errors["profile-bio"] = "Maximum 300 characters allowed.";
    }

    if (professional.expertiseLevel && !EXPERTISE_VALUES.includes(professional.expertiseLevel)) {
      errors["profile-expertiseLevel"] = "Select a valid expertise level.";
    }
    if (professional.availability && !AVAILABILITY_VALUES.includes(professional.availability)) {
      errors["profile-availability"] = "Select a valid availability.";
    }

    const yearsRaw = String(professional.yearsExperience || "").trim();
    if (yearsRaw) {
      if (!/^\d+$/.test(yearsRaw)) {
        errors["profile-yearsExperience"] = "Only numbers are allowed.";
      } else {
        const yearsNum = Number(yearsRaw);
        if (!Number.isInteger(yearsNum) || yearsNum < 0 || yearsNum > 60) {
          errors["profile-yearsExperience"] = "Value must be between 0 and 60.";
        }
      }
    }

    const domainKeys = ["tech", "education", "event", "architecture"];
    for (const key of domainKeys) {
      const detail = professional.domainDetails?.[key] || {};
      validateCsvField(detail.focusAreas, 20, 64, `domain-${key}-focusAreas`, "Focus Areas", errors);
      validateCsvField(detail.primaryStack, 30, 64, `domain-${key}-primaryStack`, "Primary Stack", errors);
      validateCsvField(detail.deliverables, 20, 80, `domain-${key}-deliverables`, "Deliverables", errors);
      if (String(detail.proofPoints || "").length > 500) {
        errors[`domain-${key}-proofPoints`] = "Proof Points must be under 500 characters.";
      }
    }

    return errors;
  };
  // Load current user
  useEffect(() => {
    let alive = true;

    const load = async () => {
      setLoading(true);
      setErr("");
      try {
        const r = await apiFetch(`${API_BASE}/api/auth/me`, {
          credentials: "include",
          cache: "no-store",
          headers: { "Cache-Control": "no-cache" },
        });

        if (!r.ok) throw new Error("Failed to load profile");

        const { user: u } = await r.json();
        if (!alive) return;

        setUser(u || null);
        const initialName = u?.name || (u?.email ? u.email.split("@")[0] : "");
        setName(initialName);
        setEmail(u?.email || "");
        setAvatarUrl(u?.avatar || null);

        setSkills(Array.isArray(u?.skills) ? u.skills : []);

        // NEW: set initial bio
        setBio(u?.bio || "");
        setProfessional(createProfessionalState(u?.professionalProfile || {}));

        setSavedProjects(Array.isArray(u?.projects) ? u.projects : []);
      } catch (e) {
        if (alive) setErr(e.message || "Could not fetch profile");
      } finally {
        if (alive) setLoading(false);
      }
    };
    load();
    return () => {
      alive = false;
    };
  }, []);


  // Auto-refresh plan + projects every 30s
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const r = await fetch(`${API_BASE}/api/auth/me`, {
          credentials: "include",
          cache: "no-store",
        });
        if (r.ok) {
          const { user: u } = await r.json();
          setUser(u);
          setSavedProjects(Array.isArray(u?.projects) ? u.projects : []);
        }
      } catch (e) {
        console.error("Auto-refresh failed:", e);
      }
    }, 30000); // every 30s

    return () => clearInterval(interval);
  }, []);

  // Helpers
  const initial = useMemo(() => {
    return (name || email || "U").trim().charAt(0).toUpperCase();
  }, [name, email]);
  const publicSlug = safeSlug(user?.slug, "");
  const safeAvatarUrl =
    typeof avatarUrl === "string" && avatarUrl.startsWith("blob:")
      ? avatarUrl
      : safeMediaUrl(avatarUrl, "");

  const handleAvatarPick = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!/^image\//.test(f.type)) {
      alert("Please select an image file.");
      return;
    }
    if (f.size > 5 * 1024 * 1024) {
      alert("Max file size is 5MB.");
      return;
    }
    setAvatarFile(f);
    const nextUrl = URL.createObjectURL(f);
    setAvatarUrl(nextUrl);
  };

  const saveAvatar = async () => {
    if (!avatarFile) {
      alert("Pick an image first.");
      return;
    }
    setAvatarSaving(true);
    setErr("");
    try {
      const fd = new FormData();
      fd.append("avatar", avatarFile);
      const res = await apiFetch(`${API_BASE}/api/users/avatar`, {
        method: "POST",
        body: fd,
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Avatar update not implemented yet");
      }
      const d = await res.json().catch(() => ({}));
      const newUrl = d?.user?.avatar || avatarUrl;
      setAvatarUrl(newUrl);
      setAvatarFile(null);
      alert("Profile picture updated.");
    } catch (e) {
      setErr(e.message || "Failed to update avatar");
    } finally {
      setAvatarSaving(false);
    }
  };

  const addSkill = () => {
    const s = skillInput.trim();
    if (!s) return;
    if (skills.includes(s)) return;
    if (s.length > 32) {
      setErr("Each skill must be under 32 characters.");
      setValidationErrors({ "profile-skillInput": "Each skill must be under 32 characters." });
      return;
    }
    if (skills.length >= 20) {
      alert("Max 20 skills.");
      return;
    }
    setSkills((prev) => [...prev, s]);
    setSkillInput("");
    clearFieldError("profile-skillInput");
  };

  const removeSkill = (idx) => {
    setSkills((prev) => prev.filter((_, i) => i !== idx));
  };

  const addProject = () => {
    if (projects.length + savedProjects.length >= maxProjects) {
      alert(`You can add up to ${maxProjects} projects with your ${user?.plan || "free"} plan.`);
      return;
    }
    setProjects((prev) => [...prev, { title: "", description: "", link: "", files: [], previews: [] }]);
    setEditingIndex(null);
  };


  const removeProject = (idx) => {
    setProjects((prev) => {
      const next = [...prev];
      next[idx]?.previews?.forEach((p) => URL.revokeObjectURL(p));
      next.splice(idx, 1);
      return next;
    });
  };

  const updateProjectField = (idx, field, value) => {
    setProjects((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      return next;
    });
  };

  const onProjectFiles = (idx, fileList) => {
    const files = Array.from(fileList || []);
    setProjects((prev) => {
      const cur = prev[idx] || { title: "", description: "", files: [], previews: [] };
      const all = [...cur.files, ...files].slice(0, 5); // max 5
      cur.previews?.forEach((p) => URL.revokeObjectURL(p));
      const previews = all.map((f) => URL.createObjectURL(f));
      const next = [...prev];
      next[idx] = { ...cur, files: all, previews };
      return next;
    });
  };

  const clearProjectFile = (pIdx, fIdx) => {
    setProjects((prev) => {
      const next = [...prev];
      const proj = next[pIdx];
      if (!proj) return prev;
      const previews = [...proj.previews];
      const files = [...proj.files];
      if (previews[fIdx]) URL.revokeObjectURL(previews[fIdx]);
      previews.splice(fIdx, 1);
      files.splice(fIdx, 1);
      next[pIdx] = { ...proj, previews, files };
      return next;
    });
  };

  const saveProfile = async () => {
    setSaving(true);
    setErr("");
    setFieldErrors({});
    try {
      const localErrors = validateProfileForm();
      if (Object.keys(localErrors).length > 0) {
        setErr("Please fix the highlighted validation errors.");
        setValidationErrors(localErrors);
        return;
      }

      const body = {
        name: String(name || "").trim(),
        skills,
        bio: (bio || "").slice(0, 300),
        professionalProfile: professionalToPayload(professional),
      };
      const res = await apiFetch(`${API_BASE}/api/users/me`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        if (d?.error === "ValidationError" && Array.isArray(d?.details)) {
          const mapped = {};
          const generic = [];
          for (const issue of d.details) {
            const inputId = fieldPathToId(issue?.path);
            const friendly = friendlyValidationMessage(issue, inputId);
            if (inputId && !mapped[inputId]) {
              mapped[inputId] = friendly;
            } else if (friendly) {
              generic.push(friendly);
            }
          }
          if (Object.keys(mapped).length > 0) {
            setErr(generic[0] || "Please fix the highlighted validation errors.");
            setValidationErrors(mapped);
            return;
          }
          if (generic.length > 0) {
            setErr(generic[0]);
            return;
          }
        }
        throw new Error(d.error || "Profile update not implemented yet");
      }
      setFieldErrors({});
      alert("Profile saved.");
    } catch (e) {
      setErr(e.message || "Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  // --- Saved projects: actions ---
  const editSavedProject = (idx) => {
    const p = savedProjects[idx];
    if (!p) return;
    setProjects([{ title: p.title || "", description: p.description || "", link: p.link || "", files: [], previews: [] }]);
    setEditingIndex(idx);
    scrollToEditor();
  };

  const deleteSavedProject = async (idx) => {
    if (!confirm("Delete this project? This will remove its media too.")) return;
    try {
      const res = await apiFetch(`${API_BASE}/api/users/projects/${idx}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Failed to delete project");
      }
      const d = await res.json();
      setSavedProjects(d?.user?.projects || []);
      alert("Project deleted.");
    } catch (e) {
      setErr(e.message || "Failed to delete project");
    }
  };

  const deleteSavedProjectMedia = async (idx, publicId) => {
    if (!confirm("Remove this media file?")) return;
    try {
      const res = await apiFetch(
        `${API_BASE}/api/users/projects/${idx}/media/${encodeURIComponent(publicId)}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Failed to delete media");
      }
      const d = await res.json();
      setSavedProjects(d?.user?.projects || []);
    } catch (e) {
      setErr(e.message || "Failed to delete media");
    }
  };

  const saveProjects = async () => {
    setProjectSaving(true);
    setErr("");
    try {
      // --- UPDATE existing project (title/description only) ---
      if (editingIndex !== null && projects[0]) {
        const p = projects[0];
        if (!p.title?.trim()) throw new Error("Add a title to the project");

        // 1) update metadata
        const res = await apiFetch(`${API_BASE}/api/users/projects/${editingIndex}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: p.title, description: p.description, link: (p.link || "").trim() }),
        });
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          throw new Error(d.error || "Failed to update project");
        }

        // 2) upload media (if any) for this index
        if (p.files?.length) {
          const fd = new FormData();
          p.files.slice(0, 5).forEach((f) => fd.append("files", f));
          const mr = await apiFetch(`${API_BASE}/api/users/projects/${editingIndex}/media`, {
            method: "POST",
            body: fd,
          });
          if (!mr.ok) {
            const md = await mr.json().catch(() => ({}));
            throw new Error(md.error || "Failed to upload project media");
          }
        }

        // 3) refresh saved list
        const me = await fetch(`${API_BASE}/api/auth/me`, { credentials: "include", cache: "no-store", headers: { "Cache-Control": "no-cache" } });
        const meJson = await me.json();
        setSavedProjects(Array.isArray(meJson?.user?.projects) ? meJson.user.projects : []);

        setProjects([]);
        setEditingIndex(null);
        alert("Project updated.");
        return;
      }

      // --- CREATE/APPEND new projects ---
      const newPayload = projects.map((p) => ({
        title: p.title,
        description: p.description,
        link: (p.link || "").trim(),
      }));

      // merge existing titles/descs + new ones (backend replaces array)
      const existingSlim = (savedProjects || []).map((p) => ({
        title: p?.title || "",
        description: p?.description || "",
        link: (p?.link || "").trim(),
      }));

      const merged = [...existingSlim, ...newPayload].slice(0, maxProjects);
      // 1) save metadata for all
      const res = await apiFetch(`${API_BASE}/api/users/projects`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projects: merged }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Project save not implemented yet");
      }

      // 2) upload media for the *newly added* projects to their indices
      const startIndex = existingSlim.length; // first new index
      for (let i = 0; i < projects.length; i++) {
        const p = projects[i];
        if (!p.files || p.files.length === 0) continue;

        const fd = new FormData();
        p.files.slice(0, 5).forEach((f) => fd.append("files", f)); // max 5 files
        const mr = await apiFetch(`${API_BASE}/api/users/projects/${startIndex + i}/media`, {
          method: "POST",
          body: fd,
        });
        if (!mr.ok) {
          const md = await mr.json().catch(() => ({}));
          throw new Error(md.error || "Failed to upload project media");
        }
      }

      // 3) refresh saved list (now includes media)
      const me = await fetch(`${API_BASE}/api/auth/me`, { credentials: "include", cache: "no-store", headers: { "Cache-Control": "no-cache" } });
      const meJson = await me.json();
      setSavedProjects(Array.isArray(meJson?.user?.projects) ? meJson.user.projects : []);

      setProjects([]);
      alert("Project saved.");
    } catch (e) {
      setErr(e.message || "Failed to save projects");
    } finally {
      setProjectSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      <Navbar />

      <main className="relative mx-auto max-w-6xl px-6 pt-24 pb-16">
        {/* Background Accents - adjusted for light theme */}
        <div className="absolute top-0 inset-x-0 h-96 bg-gradient-to-b from-white to-transparent pointer-events-none -z-10" />

        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold">
            <GradientText>Profile</GradientText>
          </h1>
          <p className="text-slate-600 mt-2 text-lg">Build a marketplace-ready profile and showcase your best work.</p>

          {/* Public profile link */}
          {publicSlug && (
            <div className="mt-3 text-sm text-slate-500">
              Public profile:{" "}
              <a
                href={`/u/${publicSlug}`}
                className="text-blue-600 hover:text-blue-700 font-medium underline underline-offset-2 ml-1"
                target="_blank"
                rel="noreferrer"
              >
                {window.location.host}/u/{publicSlug}
              </a>
            </div>
          )}

        </div>
        {user?.plan && user.plan !== "free" && (
          <GlassCard className="mb-8 p-4 text-center bg-blue-50/50 border-blue-100">
            <p className="text-lg font-semibold text-slate-900">
              You are on <span className="text-blue-600 uppercase">{user.plan}</span> plan
            </p>
            <p className="text-sm text-slate-600 mt-1">
              {user.plan === "plus"
                ? "You can add up to 5 projects."
                : user.plan === "ultra"
                  ? "You can add up to 10 projects."
                  : ""}
            </p>
          </GlassCard>
        )}


        {err && (
          <GlassCard className="mb-6 p-4 bg-red-50 border-red-200 text-red-600 flex items-center gap-2">
            <span className="font-bold">Error:</span> {err}
          </GlassCard>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500">
            <Loader2 className="h-10 w-10 animate-spin text-blue-500 mb-4" />
            <p className="text-lg font-medium">Loading your profile...</p>
          </div>
        ) : (
          <div className="grid gap-8 md:grid-cols-3">
            {/* Left column: Avatar + Professional profile */}
            <div className="md:col-span-1 space-y-6">
              <GlassCard className="p-6 flex flex-col items-center">
                {/* Avatar */}
                <div className="relative h-32 w-32 rounded-full border-4 border-slate-100 bg-slate-100 overflow-hidden flex items-center justify-center shadow-inner group">
                  {safeAvatarUrl ? (
                    <img
                      src={safeAvatarUrl}
                      alt="Profile"
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <span className="text-4xl font-bold text-slate-400">{initial}</span>
                  )}
                </div>

                {/* Change avatar */}
                <div className="mt-5 w-full flex flex-col items-center gap-3">
                  <input
                    type="file"
                    accept="image/*"
                    ref={avatarInputRef}
                    onChange={handleAvatarPick}
                    className="hidden"
                  />
                  <button
                    onClick={() => avatarInputRef.current?.click()}
                    className="flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
                  >
                    <Camera className="h-4 w-4" />
                    Change profile pic
                  </button>
                  {avatarFile && (
                    <NeonButton
                      onClick={saveAvatar}
                      loading={avatarSaving}
                      className="w-full justify-center mt-2"
                    >
                      {avatarSaving ? "Saving..." : "Save new photo"}
                    </NeonButton>
                  )}
                </div>
              </GlassCard>

              <GlassCard className="p-6 space-y-6">
                <div className="flex items-center gap-2 text-slate-900">
                  <Briefcase className="h-4 w-4 text-blue-600" />
                  <h2 className="text-base font-semibold">Professional Identity</h2>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Display Name</label>
                    <input
                      id="profile-name"
                      value={name}
                      onChange={(e) => {
                        setName(e.target.value);
                        clearFieldError("profile-name");
                      }}
                      placeholder="How you appear publicly"
                      className={`w-full rounded-lg border bg-slate-50 px-3 py-2 text-slate-900 outline-none focus:bg-white transition-all ${
                        fieldErrors["profile-name"]
                          ? "border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
                          : "border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                      }`}
                    />
                    {fieldErrors["profile-name"] && <p className="mt-1 text-xs text-red-600">{fieldErrors["profile-name"]}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Account Email</label>
                    <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-slate-500 cursor-not-allowed">
                      <Mail className="h-4 w-4" />
                      <span className="truncate">{email || "-"}</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Headline</label>
                    <input
                      id="profile-headline"
                      value={professional.headline}
                      onChange={(e) => setProfessionalField("headline", e.target.value)}
                      placeholder="e.g. Product Engineer for Sponsorship & Event Platforms"
                      className={`w-full rounded-lg border bg-slate-50 px-3 py-2 text-slate-900 outline-none focus:bg-white transition-all ${
                        fieldErrors["profile-headline"]
                          ? "border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
                          : "border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                      }`}
                    />
                    {fieldErrors["profile-headline"] && <p className="mt-1 text-xs text-red-600">{fieldErrors["profile-headline"]}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Value Proposition</label>
                    <textarea
                      id="profile-valueProposition"
                      value={professional.valueProposition}
                      onChange={(e) => setProfessionalField("valueProposition", e.target.value)}
                      rows={3}
                      placeholder="One clear line on what outcomes you deliver."
                      className={`w-full rounded-lg border bg-slate-50 px-3 py-2 text-slate-900 outline-none focus:bg-white transition-all resize-none ${
                        fieldErrors["profile-valueProposition"]
                          ? "border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
                          : "border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                      }`}
                    />
                    {fieldErrors["profile-valueProposition"] && <p className="mt-1 text-xs text-red-600">{fieldErrors["profile-valueProposition"]}</p>}
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Expertise Level</label>
                      <select
                        id="profile-expertiseLevel"
                        value={professional.expertiseLevel}
                        onChange={(e) => setProfessionalField("expertiseLevel", e.target.value)}
                        className={`w-full rounded-lg border bg-slate-50 px-3 py-2 text-slate-900 outline-none focus:bg-white transition-all ${
                          fieldErrors["profile-expertiseLevel"]
                            ? "border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
                            : "border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                        }`}
                      >
                        <option value="">Select level</option>
                        <option value="starter">Starter</option>
                        <option value="intermediate">Intermediate</option>
                        <option value="advanced">Advanced</option>
                        <option value="expert">Expert</option>
                      </select>
                      {fieldErrors["profile-expertiseLevel"] && <p className="mt-1 text-xs text-red-600">{fieldErrors["profile-expertiseLevel"]}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Years of Experience</label>
                      <input
                        id="profile-yearsExperience"
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={professional.yearsExperience}
                        onChange={(e) => setProfessionalField("yearsExperience", e.target.value.replace(/\D/g, "").slice(0, 2))}
                        placeholder="e.g. 3"
                        className={`w-full rounded-lg border bg-slate-50 px-3 py-2 text-slate-900 outline-none focus:bg-white transition-all ${
                          fieldErrors["profile-yearsExperience"]
                            ? "border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
                            : "border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                        }`}
                      />
                      {fieldErrors["profile-yearsExperience"] && <p className="mt-1 text-xs text-red-600">{fieldErrors["profile-yearsExperience"]}</p>}
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Availability</label>
                      <select
                        id="profile-availability"
                        value={professional.availability}
                        onChange={(e) => setProfessionalField("availability", e.target.value)}
                        className={`w-full rounded-lg border bg-slate-50 px-3 py-2 text-slate-900 outline-none focus:bg-white transition-all ${
                          fieldErrors["profile-availability"]
                            ? "border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
                            : "border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                        }`}
                      >
                        <option value="open">Open for work</option>
                        <option value="limited">Limited bandwidth</option>
                        <option value="booked">Booked</option>
                        <option value="not-looking">Not looking</option>
                      </select>
                      {fieldErrors["profile-availability"] && <p className="mt-1 text-xs text-red-600">{fieldErrors["profile-availability"]}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Response SLA</label>
                      <input
                        id="profile-responseSla"
                        value={professional.responseSla}
                        onChange={(e) => setProfessionalField("responseSla", e.target.value)}
                        placeholder="e.g. within 24 hours"
                        className={`w-full rounded-lg border bg-slate-50 px-3 py-2 text-slate-900 outline-none focus:bg-white transition-all ${
                          fieldErrors["profile-responseSla"]
                            ? "border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
                            : "border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                        }`}
                      />
                      {fieldErrors["profile-responseSla"] && <p className="mt-1 text-xs text-red-600">{fieldErrors["profile-responseSla"]}</p>}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Bio</label>
                    <textarea
                      id="profile-bio"
                      value={bio}
                      onChange={(e) => {
                        setBio(e.target.value.slice(0, 300));
                        clearFieldError("profile-bio");
                      }}
                      placeholder="Short professional summary (max 300 chars)"
                      className={`w-full rounded-lg border bg-slate-50 px-3 py-2 text-slate-900 outline-none focus:bg-white transition-all resize-none ${
                        fieldErrors["profile-bio"]
                          ? "border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
                          : "border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                      }`}
                      rows={4}
                    />
                    {fieldErrors["profile-bio"] && <p className="mt-1 text-xs text-red-600">{fieldErrors["profile-bio"]}</p>}
                    <div className={`text-xs text-right mt-1 ${bio.length >= 300 ? "text-red-500" : "text-slate-400"}`}>
                      {bio.length}/300
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Skills</label>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {skills.map((s, i) => (
                        <SkillPill key={i} text={s} onRemove={() => removeSkill(i)} />
                      ))}
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        id="profile-skillInput"
                        value={skillInput}
                        onChange={(e) => {
                          setSkillInput(e.target.value);
                          clearFieldError("profile-skillInput");
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            addSkill();
                          }
                        }}
                        placeholder="Add skill..."
                        className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:bg-white transition-all"
                      />
                      <button
                        onClick={addSkill}
                        type="button"
                        className="p-2 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-blue-600 transition-colors"
                        aria-label="Add skill"
                      >
                        <Plus className="h-5 w-5" />
                      </button>
                    </div>
                    {fieldErrors["profile-skillInput"] && <p className="mt-1 text-xs text-red-600">{fieldErrors["profile-skillInput"]}</p>}
                  </div>
                </div>

                <div className="pt-2">
                  <NeonButton onClick={saveProfile} loading={saving} className="w-full justify-center">
                    <Save className="h-4 w-4" />
                    {saving ? "Saving..." : "Save Profile"}
                  </NeonButton>
                </div>
              </GlassCard>
            </div>

            {/* Right column: Projects */}
            <div className="md:col-span-2 space-y-6">
              <GlassCard className="p-6" id="domain-selector">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Domain Focus</h2>
                    <p className="text-sm text-slate-500 mt-1">
                      Select the verticals you actively work in, then add domain-specific proof and deliverables.
                    </p>
                  </div>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {DOMAIN_OPTIONS.map((domain) => {
                    const Icon = domain.icon;
                    const active = professional.domains.includes(domain.key);
                    return (
                      <button
                        key={domain.key}
                        type="button"
                        onClick={() => toggleDomain(domain.key)}
                        className={`rounded-xl border px-4 py-3 text-left transition-all ${
                          active
                            ? `${domain.color} shadow-sm`
                            : "border-slate-200 bg-white text-slate-700 hover:border-blue-200 hover:bg-blue-50/40"
                        }`}
                      >
                        <div className="inline-flex items-center gap-2 text-sm font-semibold">
                          <Icon className="h-4 w-4" />
                          {domain.label}
                        </div>
                      </button>
                    );
                  })}
                </div>
                {fieldErrors["domain-selector"] && (
                  <p className="mt-2 text-xs text-red-600">{fieldErrors["domain-selector"]}</p>
                )}
              </GlassCard>

              {selectedDomainOptions.length > 0 && (
                <GlassCard className="p-6">
                  <h3 className="text-lg font-bold text-slate-900">Domain Details</h3>
                  <p className="text-sm text-slate-500 mt-1">
                    Use comma-separated values for quick editing.
                  </p>

                  <div className="mt-5 space-y-5">
                    {selectedDomainOptions.map((domain) => {
                      const detail = professional.domainDetails?.[domain.key] || {};
                      const Icon = domain.icon;
                      return (
                        <div key={domain.key} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                          <div className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900 mb-3">
                            <Icon className="h-4 w-4 text-blue-600" />
                            {domain.label}
                          </div>

                          <div className="grid gap-4 md:grid-cols-2">
                            <div>
                              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">Focus Areas</label>
                              <input
                                id={`domain-${domain.key}-focusAreas`}
                                value={detail.focusAreas || ""}
                                onChange={(e) => setDomainField(domain.key, "focusAreas", e.target.value)}
                                placeholder="Comma-separated focus areas"
                                className={`w-full rounded-lg border bg-white px-3 py-2 text-slate-900 outline-none transition-all ${
                                  fieldErrors[`domain-${domain.key}-focusAreas`]
                                    ? "border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
                                    : "border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                                }`}
                              />
                              {fieldErrors[`domain-${domain.key}-focusAreas`] && <p className="mt-1 text-xs text-red-600">{fieldErrors[`domain-${domain.key}-focusAreas`]}</p>}
                            </div>
                            <div>
                              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">{domain.stackLabel}</label>
                              <input
                                id={`domain-${domain.key}-primaryStack`}
                                value={detail.primaryStack || ""}
                                onChange={(e) => setDomainField(domain.key, "primaryStack", e.target.value)}
                                placeholder="Comma-separated tools or methods"
                                className={`w-full rounded-lg border bg-white px-3 py-2 text-slate-900 outline-none transition-all ${
                                  fieldErrors[`domain-${domain.key}-primaryStack`]
                                    ? "border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
                                    : "border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                                }`}
                              />
                              {fieldErrors[`domain-${domain.key}-primaryStack`] && <p className="mt-1 text-xs text-red-600">{fieldErrors[`domain-${domain.key}-primaryStack`]}</p>}
                            </div>
                            <div>
                              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">Deliverables</label>
                              <input
                                id={`domain-${domain.key}-deliverables`}
                                value={detail.deliverables || ""}
                                onChange={(e) => setDomainField(domain.key, "deliverables", e.target.value)}
                                placeholder="Comma-separated deliverables"
                                className={`w-full rounded-lg border bg-white px-3 py-2 text-slate-900 outline-none transition-all ${
                                  fieldErrors[`domain-${domain.key}-deliverables`]
                                    ? "border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
                                    : "border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                                }`}
                              />
                              {fieldErrors[`domain-${domain.key}-deliverables`] && <p className="mt-1 text-xs text-red-600">{fieldErrors[`domain-${domain.key}-deliverables`]}</p>}
                            </div>
                            <div>
                              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">Proof Points</label>
                              <textarea
                                id={`domain-${domain.key}-proofPoints`}
                                value={detail.proofPoints || ""}
                                onChange={(e) => setDomainField(domain.key, "proofPoints", e.target.value)}
                                rows={2}
                                placeholder="Short evidence: outcomes, scale, metrics, recognitions."
                                className={`w-full rounded-lg border bg-white px-3 py-2 text-slate-900 outline-none transition-all resize-none ${
                                  fieldErrors[`domain-${domain.key}-proofPoints`]
                                    ? "border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
                                    : "border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                                }`}
                              />
                              {fieldErrors[`domain-${domain.key}-proofPoints`] && <p className="mt-1 text-xs text-red-600">{fieldErrors[`domain-${domain.key}-proofPoints`]}</p>}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </GlassCard>
              )}
              {selectedDomainOptions.length === 0 && (
                <GlassCard className="p-5 border-dashed">
                  <p className="text-sm text-slate-500">
                    Select at least one domain above to add focused capabilities and proof points.
                  </p>
                </GlassCard>
              )}

              <div ref={editorRef}>
                <GlassCard className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
                        <FolderOpen className="h-5 w-5" />
                      </div>
                      <h2 className="text-xl font-bold text-slate-900">
                        {editingIndex !== null ? `Edit Project #${editingIndex + 1}` : "Portfolio Projects"}
                      </h2>
                    </div>
                    <button
                      onClick={addProject}
                      disabled={savedProjects.length + projects.length >= maxProjects}
                      className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors
                          ${savedProjects.length + projects.length >= maxProjects
                          ? "opacity-50 cursor-not-allowed bg-slate-100 text-slate-400"
                          : "bg-blue-600 text-white hover:bg-blue-700 shadow-sm"
                        }`}
                    >
                      <Plus className="h-4 w-4" /> Add Project
                    </button>
                  </div>

                  {projects.length === 0 && savedProjects.length === 0 && (
                    <div className="text-center py-12 px-4 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/50">
                      <FolderOpen className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                      <h3 className="text-lg font-medium text-slate-900">No projects yet</h3>
                      <p className="text-slate-500 max-w-sm mx-auto mt-1">
                        Add your best work here. You can add up to <span className="font-semibold text-slate-900">{maxProjects}</span> projects with your current plan.
                      </p>
                      <button
                        onClick={addProject}
                        className="mt-6 text-blue-600 font-medium hover:text-blue-700 hover:underline"
                      >
                        Create your first project &rarr;
                      </button>
                    </div>
                  )}

                  <div className="space-y-6">
                    {projects.map((p, idx) => (
                      <div key={idx} className="rounded-xl border border-slate-200 bg-slate-50 p-5 shadow-sm">
                        <div className="flex items-start justify-between mb-4">
                          <h3 className="text-slate-800 font-semibold flex items-center gap-2">
                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-xs text-blue-700">
                              {idx + 1}
                            </span>
                            New Project
                          </h3>
                          <button
                            onClick={() => removeProject(idx)}
                            className="text-slate-400 hover:text-red-500 transition-colors p-1"
                            aria-label="Remove project"
                          >
                            <X className="h-5 w-5" />
                          </button>
                        </div>

                        <div className="grid gap-5 md:grid-cols-2">
                          <div className="col-span-2 md:col-span-1">
                            <label className="block text-sm font-medium text-slate-700 mb-1">Project Title</label>
                            <input
                              value={p.title}
                              onChange={(e) => updateProjectField(idx, "title", e.target.value)}
                              placeholder="e.g. E-commerce Dashboard"
                              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                            />
                          </div>

                          <div className="col-span-2 md:col-span-1">
                            <label className="block text-sm font-medium text-slate-700 mb-1">Project Link <span className="text-slate-400 font-normal">(Optional)</span></label>
                            <div className="relative">
                              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <LinkIcon className="h-4 w-4 text-slate-400" />
                              </div>
                              <input
                                value={p.link || ""}
                                onChange={(e) => updateProjectField(idx, "link", e.target.value)}
                                placeholder="https://..."
                                className="w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 py-2 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                              />
                            </div>
                          </div>

                          <div className="col-span-2">
                            <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                            <textarea
                              value={p.description}
                              onChange={(e) => updateProjectField(idx, "description", e.target.value)}
                              rows={3}
                              placeholder="Describe your role, technologies used, and the outcome..."
                              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all resize-none"
                            />
                          </div>
                        </div>

                        <div className="mt-5 pt-4 border-t border-slate-200">
                          <label className="block text-sm font-medium text-slate-700 mb-2">Media <span className="text-slate-400 font-normal">(Max 5 images/videos)</span></label>
                          <div className="flex flex-wrap items-center gap-3">
                            <input
                              id={`files-${idx}`}
                              type="file"
                              accept="image/*,video/*"
                              multiple
                              onChange={(e) => onProjectFiles(idx, e.target.files)}
                              className="hidden"
                            />
                            <label
                              htmlFor={`files-${idx}`}
                              className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:border-blue-400 hover:text-blue-600 transition-all"
                            >
                              <Plus className="h-5 w-5" />
                              Add files
                            </label>

                            {p.previews?.length > 0 && (
                              <div className="flex flex-wrap gap-3">
                                {p.previews.map((url, fIdx) => (
                                  <MediaThumb
                                    key={url}
                                    file={p.files[fIdx]}
                                    url={url}
                                    onRemove={() => clearProjectFile(idx, fIdx)}
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {projects.length > 0 && (
                    <div className="mt-8 flex justify-end">
                      <NeonButton onClick={saveProjects} loading={projectSaving}>
                        <Save className="h-4 w-4" />
                        {projectSaving
                          ? (editingIndex !== null ? "Updating..." : "Saving...")
                          : (editingIndex !== null ? "Update Project" : "Save All Projects")}
                      </NeonButton>
                    </div>
                  )}
                </GlassCard>
              </div>

              {/* Read-only list of saved projects with actions */}
              {savedProjects?.length > 0 && (
                <div className="space-y-6">
                  <h3 className="text-lg font-bold text-slate-800 px-1">Your Portfolio</h3>
                  {savedProjects.map((p, i) => (
                    <GlassCard key={i} className="p-6 relative group hover:border-blue-300 hover:shadow-md transition-all">
                      <div className="flex flex-col md:flex-row gap-6">
                        {/* Project content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="text-xl font-bold text-slate-900">{p.title}</h3>
                              {safeHttpUrl(p.link || "", "") && (
                                <a
                                  href={safeHttpUrl(p.link || "", "#")}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1 mt-1 text-sm text-blue-600 hover:text-blue-800 hover:underline"
                                >
                                  <LinkIcon className="h-3.5 w-3.5" />
                                  {p.link.replace(/^https?:\/\//i, '')}
                                </a>
                              )}
                            </div>


                          </div>

                          {p.description && (
                            <p className="mt-3 text-slate-600 leading-relaxed whitespace-pre-line">{p.description}</p>
                          )}

                          {Array.isArray(p.media) && p.media.length > 0 && (
                            <div className="mt-5 flex flex-wrap gap-4">
                              {p.media.map((m, j) => {
                                const mediaUrl = safeMediaUrl(m?.url, "");
                                if (!mediaUrl) return null;
                                const isVideo = (m?.contentType || "").startsWith("video/");
                                return (
                                  <div
                                    key={j}
                                    className="relative w-32 h-32 md:w-40 md:h-40 rounded-xl overflow-hidden border border-slate-200 bg-slate-100 shadow-sm hover:shadow-md transition-shadow cursor-zoom-in"
                                    onClick={() => safeExternalOpen(mediaUrl)}
                                  >
                                    {isVideo ? (
                                      <video src={mediaUrl} className="w-full h-full object-cover" muted />
                                    ) : (
                                      <img src={mediaUrl} className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" alt="project media" />
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex md:flex-col gap-2 md:border-l md:border-slate-100 md:pl-6 justify-start">
                          <button
                            onClick={() => editSavedProject(i)}
                            className="px-4 py-2 rounded-lg bg-white border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 hover:text-blue-600 hover:border-blue-200 transition-all flex items-center justify-center gap-2 w-full md:w-auto"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => deleteSavedProject(i)}
                            className="px-4 py-2 rounded-lg bg-white border border-slate-200 text-slate-600 text-sm font-medium hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all flex items-center justify-center gap-2 w-full md:w-auto"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </GlassCard>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}

