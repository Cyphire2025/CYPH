/* eslint-disable no-unused-vars */
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Navbar from "../components/navbarsponhome";
import Footer from "../components/footer";
import {
  ArrowLeft,
  AlertCircle,
  Briefcase,
  ExternalLink,
  Mail,
  Phone,
  User,
  Globe,
  Paperclip,
  FileText,
  FileSpreadsheet,
  File,
  ShieldCheck,
} from "lucide-react";

const API_BASE = import.meta.env?.VITE_API_BASE || "http://localhost:5000";

const Background = () => (
  <div className="absolute inset-0 -z-10 h-full w-full bg-slate-50 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px]">
    <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-blue-400 opacity-20 blur-[100px]" />
    <div className="absolute right-0 bottom-0 -z-10 h-[310px] w-[310px] rounded-full bg-indigo-400 opacity-20 blur-[100px]" />
  </div>
);

const Card = ({ children, className = "" }) => (
  <div className={`rounded-2xl border border-slate-200 bg-white p-6 shadow-sm ${className}`}>{children}</div>
);

const Label = ({ icon: Icon, children }) => (
  <div className="mb-1 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
    {Icon ? <Icon className="h-3.5 w-3.5 text-blue-500" /> : null}
    {children}
  </div>
);

export default function ViewSponsorship() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [task, setTask] = useState(null);
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      setLoading(true);
      setErr("");
      try {
        const [meRes, taskRes] = await Promise.all([
          fetch(`${API_BASE}/api/auth/me`, { cache: "no-store", credentials: "include" }),
          fetch(`${API_BASE}/api/tasks/${id}`, { cache: "no-store", credentials: "include" }),
        ]);

        const meJson = meRes.ok ? await meRes.json() : { user: null };
        const tJson = taskRes.ok ? await taskRes.json() : null;
        if (!alive) return;

        const meUser = meJson?.user || null;
        setMe(meUser);
        if (!tJson) throw new Error("Sponsorship not found");

        const cats = Array.isArray(tJson.category) ? tJson.category : [tJson.category];
        const isSponsorship = cats.some((c) => String(c || "").toLowerCase() === "sponsorship");
        if (!isSponsorship) {
          navigate(`/task/${id}`, { replace: true });
          return;
        }

        setTask(tJson);
        const creatorId = tJson.createdBy?._id || tJson.createdBy;
        if (meUser?._id) setIsOwner(String(creatorId) === String(meUser._id));
      } catch (e) {
        if (alive) setErr(e.message || "Failed to load sponsorship");
      } finally {
        if (alive) setLoading(false);
      }
    };
    load();
    return () => {
      alive = false;
    };
  }, [id, navigate]);

  const categoryLabels = useMemo(() => {
    const cats = [];
    if (typeof task?.category === "string") cats.push(task.category);
    if (Array.isArray(task?.category)) cats.push(...task.category);
    if (Array.isArray(task?.categories)) cats.push(...task.categories);
    return [...new Set(cats)];
  }, [task]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 text-slate-900">
        <div className="w-16 h-16 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin mb-4" />
        <p className="text-slate-500 font-medium">Loading sponsorship...</p>
      </div>
    );
  }

  if (err || !task) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle size={32} />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Couldn't load sponsorship</h2>
          <p className="text-slate-500 mb-6">{err || "Listing not found"}</p>
          <button
            onClick={() => navigate(-1)}
            className="px-5 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-700 font-semibold hover:bg-slate-50"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const metadataEntries = Object.entries(task.metadata || {}).filter(([key, value]) => {
    const hiddenKeys = [
      "contactName",
      "contactEmail",
      "contactPhone",
      "contactWebsite",
      "tier",
      "listingPlan",
      "paymentVerificationId",
    ];
    if (hiddenKeys.includes(key)) return false;
    if (!value || (Array.isArray(value) && value.length === 0)) return false;
    return true;
  });

  const contactName = task?.metadata?.contactName || "Not provided";
  const contactEmail = task?.metadata?.contactEmail || "";
  const contactPhone = task?.metadata?.contactPhone || "";
  const contactWebsite = task?.metadata?.contactWebsite || "";

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans relative">
      <Navbar />
      <Background />

      <main className="relative mx-auto max-w-7xl px-4 sm:px-6 pt-24 pb-16">
        <div className="mb-6 flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 shadow-sm transition-all"
          >
            <ArrowLeft className="h-4 w-4" /> Back to listings
          </button>
          {isOwner && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-bold uppercase tracking-wide">
              <ShieldCheck className="w-3.5 h-3.5" /> Your Post
            </span>
          )}
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <div className="rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-200/50 overflow-hidden">
              <div className="h-48 md:h-64 w-full bg-slate-100 relative overflow-hidden">
                {task.logo?.url ? (
                  <img src={task.logo.url} alt="Sponsorship Header" className="w-full h-full object-cover" />
                ) : task.attachments?.length > 0 && /\.(jpg|jpeg|png|webp)$/i.test(task.attachments[0].url) ? (
                  <img src={task.attachments[0].url} alt="Sponsorship Attachment" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-slate-100 to-slate-200 flex flex-col items-center justify-center text-slate-400">
                    <Briefcase className="w-12 h-12 mb-2 opacity-50" />
                    <span className="text-sm font-medium">No cover image</span>
                  </div>
                )}
                {task.createdAt && (
                  <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-full shadow-sm text-xs font-bold text-slate-700 border border-white/20">
                    Posted {new Date(task.createdAt).toLocaleDateString()}
                  </div>
                )}
              </div>

              <div className="p-6 md:p-8">
                <div className="flex flex-wrap items-center gap-2 mb-4">
                  {categoryLabels.map((cat, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 text-xs font-semibold border border-blue-100"
                    >
                      <Briefcase className="w-3 h-3" /> {cat}
                    </span>
                  ))}
                </div>

                <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-slate-900 mb-4 leading-tight">{task.title}</h1>
                <div className="prose prose-slate max-w-none text-slate-600 mb-8 leading-relaxed">{task.description}</div>

                {metadataEntries.length > 0 && (
                  <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100">
                    <div className="flex items-center gap-2 mb-5 border-b border-slate-200 pb-3">
                      <ShieldCheck className="w-5 h-5 text-blue-600" />
                      <h3 className="font-bold text-slate-800 text-xl">Specifications</h3>
                    </div>
                    <dl className="space-y-5">
                      {metadataEntries.map(([key, value]) => {
                        const displayValue = Array.isArray(value) ? value.join(", ") : String(value);
                        return (
                          <div key={key} className="pb-4 border-b border-slate-200 last:border-b-0 last:pb-0">
                            <dt className="text-sm font-bold uppercase tracking-wide text-slate-500 mb-2">
                              {key.replace(/([A-Z])/g, " $1")}
                            </dt>
                            <dd className="text-lg font-semibold text-slate-800 leading-relaxed">{displayValue}</dd>
                          </div>
                        );
                      })}
                    </dl>
                  </div>
                )}

                {Array.isArray(task.attachments) && task.attachments.length > 0 && (
                  <div className="mt-8">
                    <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500 mb-3 flex items-center gap-2">
                      <Paperclip className="w-4 h-4" /> Attachments
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                      {task.attachments.map((file, i) => {
                        const rawUrl = file.url || file;
                        const name = file.original_name || file.name || `Attachment ${i + 1}`;
                        const isCloudinary = rawUrl.includes("cloudinary.com") && rawUrl.includes("/upload/");
                        const isImage = /\.(jpg|jpeg|png|webp|gif|svg|bmp)$/i.test(rawUrl);
                        let href = rawUrl;
                        if (isCloudinary && !isImage) href = rawUrl.replace("/upload/", "/upload/fl_attachment/");

                        return (
                          <a
                            key={i}
                            href={href}
                            target="_blank"
                            rel="noreferrer"
                            download={!isImage}
                            className="group relative aspect-video bg-slate-100 rounded-xl border border-slate-200 overflow-hidden hover:border-blue-300 transition-all flex items-center justify-center"
                          >
                            {isImage ? (
                              <img src={rawUrl} alt={name} className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                            ) : (
                              <div className="flex flex-col items-center text-slate-400">
                                {(() => {
                                  const ext = name.split(".").pop()?.toLowerCase();
                                  if (ext === "pdf") return <FileText className="w-8 h-8 mb-1 text-red-500" />;
                                  if (["xls", "xlsx", "csv"].includes(ext)) return <FileSpreadsheet className="w-8 h-8 mb-1 text-emerald-500" />;
                                  if (["doc", "docx"].includes(ext)) return <FileText className="w-8 h-8 mb-1 text-blue-500" />;
                                  if (["ppt", "pptx"].includes(ext)) return <File className="w-8 h-8 mb-1 text-orange-500" />;
                                  return <Paperclip className="w-8 h-8 mb-1" />;
                                })()}
                                <span className="text-[10px] uppercase font-bold text-slate-500 max-w-[90%] truncate">
                                  {name.split(".").pop()?.toUpperCase() || "FILE"}
                                </span>
                              </div>
                            )}
                          </a>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <Card className="border-blue-100 shadow-lg shadow-blue-500/5 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <User size={100} className="text-blue-500 transform rotate-12 translate-x-10 -translate-y-10" />
              </div>
              <div className="relative z-10">
                <div className="mb-5">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Sponsorship Contact</span>
                  <div className="text-2xl font-extrabold text-slate-900 mt-1">Get in touch</div>
                </div>

                <div className="space-y-4">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <Label icon={User}>Contact Name</Label>
                    <p className="text-base font-semibold text-slate-800">{contactName}</p>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <Label icon={Mail}>Email</Label>
                    {contactEmail ? (
                      <a href={`mailto:${contactEmail}`} className="text-base font-semibold text-blue-600 hover:underline break-all">
                        {contactEmail}
                      </a>
                    ) : (
                      <p className="text-base font-semibold text-slate-500">Not provided</p>
                    )}
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <Label icon={Phone}>Phone</Label>
                    {contactPhone ? (
                      <a href={`tel:${contactPhone}`} className="text-base font-semibold text-slate-800 hover:text-green-600">
                        {contactPhone}
                      </a>
                    ) : (
                      <p className="text-base font-semibold text-slate-500">Not provided</p>
                    )}
                  </div>

                  {contactWebsite && (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                      <Label icon={Globe}>Website</Label>
                      <a
                        href={contactWebsite.startsWith("http") ? contactWebsite : `https://${contactWebsite}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-base font-semibold text-blue-600 hover:underline break-all inline-flex items-center gap-2"
                      >
                        {contactWebsite} <ExternalLink className="h-4 w-4" />
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
