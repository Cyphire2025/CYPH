// src/components/NavbarSponHome.jsx (Refactored to match NavbarHome)
import React, { useEffect, useState } from "react";
import { FiSearch, FiMessageSquare, FiSettings, FiChevronDown, FiMenu, FiX, FiHome, FiUser, FiBriefcase } from "react-icons/fi";
import { FaRegBell } from "react-icons/fa";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { apiFetch } from "../lib/fetch";
import { safeMediaUrl } from "../utils/safeUrl";

const API_BASE = import.meta.env?.VITE_API_BASE || "http://localhost:5000";

const clearLegacyClientAuth = () => {
  const keys = ["token", "userId", "userName", "userEmail", "loginTime"];
  for (const key of keys) {
    try {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    } catch {
      // ignore storage failures
    }
  }
};

export default function NavbarSponsor() {
  const location = useLocation();
  const navigate = useNavigate();
  const [msgOpen, setMsgOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const [discoverOpen, setDiscoverOpen] = useState(false);
  const [solutionsOpen, setSolutionsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  // const [sponsorOpen, setSponsorOpen] = useState(false); // Removed to match Home layout

  const [user, setUser] = useState(null);

  const [messages, setMessages] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showAllMsgs, setShowAllMsgs] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);


  const GradientText = ({ children }) => (
    <span className="text-blue-600 font-bold tracking-tight">
      {children}
    </span>
  );

  // Helper functions for navigation
  const isActive = (path) => {
    if (path === '/sponsorshiphome') return location.pathname === '/sponsorshiphome' || location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const fetchMessages = async () => {
    try {
      const res = await apiFetch(`${API_BASE}/api/auth/notifications`, {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache" },
      });
      if (!res.ok) return;
      const data = await res.json();
      const list = Array.isArray(data) ? data : [];
      setMessages(list);
      setUnreadCount(list.filter((n) => !n.read).length);
    } catch {
      // ignore
    }
  };


  useEffect(() => {
    let alive = true;
    const fetchMe = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/auth/me`, {
          credentials: "include",
          cache: "no-store",
          headers: { "Cache-Control": "no-cache" },
        });
        if (res.ok) {
          const d = await res.json();
          if (alive) setUser(d.user || null);
        } else if (alive) setUser(null);
      } catch {
        if (alive) setUser(null);
      }
    };
    fetchMe();
    const onFocus = () => {
      fetchMe();
      fetchMessages();
    };
    window.addEventListener("focus", onFocus);
    return () => {
      alive = false;
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  useEffect(() => {
    fetchMessages();
    const iv = setInterval(fetchMessages, 30000);
    return () => clearInterval(iv);
  }, []);

  const initial = (user?.name || user?.email || "U").trim().charAt(0).toUpperCase();
  const avatarUrl = user?.avatar && typeof user.avatar === "string" ? user.avatar : null;
  const safeAvatarUrl = safeMediaUrl(avatarUrl || "", "");

  // Only show 5 until expanded
  const visibleMessages = showAllMsgs ? messages : messages.slice(0, 1);

  return (
    <header className="fixed top-0 left-0 right-0 z-50">
      <div className="absolute inset-0 z-0 bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-sm" />

      <div className="relative z-10 w-full px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between max-w-screen-2xl mx-auto">
        <div className="flex items-center gap-3 sm:gap-4 lg:gap-6 flex-grow">
          <h1
            className="text-xl sm:text-2xl lg:text-[26px] font-bold cursor-pointer transition-colors duration-200 whitespace-nowrap"
            onClick={() => (window.location.href = "/sponsorshiphome")}
          >
            <GradientText>
              {user?.plan === "plus"
                ? "Cyphire Plus"
                : user?.plan === "ultra"
                  ? "Cyphire Ultra"
                  : "Cyphire"}
            </GradientText>
          </h1>

          {/* searchbar */}
          <div className="hidden md:flex items-center bg-slate-100 border border-slate-200 rounded-full px-3 sm:px-4 py-2 w-full max-w-xs lg:max-w-lg focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 transition-all hover:bg-white hover:shadow-sm">
            <FiSearch className="text-slate-500 mr-2 flex-shrink-0" />
            <input
              type="text"
              placeholder="Search..."
              className="bg-transparent outline-none text-sm text-slate-800 w-full placeholder-slate-500"
            />
          </div>
        </div>


        <div className="hidden lg:flex items-center space-x-3">
          {/* About*/}
          <div className="relative" onMouseLeave={() => setDiscoverOpen(false)}>
            <button
              onClick={() => {
                setDiscoverOpen((v) => !v);
                setSolutionsOpen(false);
                setMsgOpen(false);
                setNotifOpen(false);
                setSettingsOpen(false);
                setProfileOpen(false);
              }}
              className="group relative flex items-center font-medium text-slate-600 hover:text-slate-900 transition-colors duration-200"
            >
              About
              <FiChevronDown
                className={`ml-1 transition-transform duration-200 text-slate-400 group-hover:text-slate-600 ${discoverOpen ? "rotate-180" : ""}`}
              />
            </button>
            {discoverOpen && (
              <div className="absolute right-0 top-full pt-3 w-52 z-20">
                <div className="bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden">
                  {["About Us", "Team", "Join us", "Contact"].map((t, i) => {
                    const paths = ["/about-us", "/team", "/join-us", "/contact"];
                    return (
                      <Link
                        key={i}
                        to={paths[i]}
                        className="block px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 hover:text-blue-600 border-b last:border-b-0 border-slate-100"
                      >
                        {t}
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Explore */}
          <div className="relative" onMouseLeave={() => setSolutionsOpen(false)}>
            <button
              onClick={() => {
                setSolutionsOpen((v) => !v);
                setDiscoverOpen(false);
                setMsgOpen(false);
                setNotifOpen(false);
                setSettingsOpen(false);
                setProfileOpen(false);
              }}
              className={`flex items-center transition-all duration-200 font-medium ${isActive('/pricing')
                ? 'text-blue-700 bg-blue-50 px-3 py-1 rounded-md'
                : 'text-slate-600 hover:text-slate-900'
                }`}
            >
              Explore
              <FiChevronDown
                className={`ml-1 transition-transform duration-200 text-slate-400 group-hover:text-slate-600 ${solutionsOpen ? "rotate-180" : ""}`}
              />
            </button>
            {solutionsOpen && (
              <div className="absolute right-0 top-full pt-3 w-56 z-20">
                <div className="bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden">
                  {["How It Works", "Pricing & Plans", "Escrow Policy", "Help Center"].map((t, i) => {
                    const paths = ["/how-it-works", "/pricing", "/escrow-policy", "/help"];
                    return (
                      <Link
                        key={i}
                        to={paths[i]}
                        className="block px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 hover:text-blue-600 border-b last:border-b-0 border-slate-100"
                      >
                        {t}
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Messages */}
          <div className="relative">
            <button
              onClick={() => {
                setMsgOpen((v) => !v);
                setNotifOpen(false);
                setSettingsOpen(false);
                setDiscoverOpen(false);
                setSolutionsOpen(false);
                setProfileOpen(false);
                if (!msgOpen) fetchMessages();
              }}
              className="text-slate-500 hover:text-slate-900 transition-all duration-200 p-2 rounded-md hover:bg-slate-100 relative"
              aria-label="Messages"
            >
              <FiMessageSquare size={20} />
              {unreadCount > 0 && (
                <span className="absolute top-0 right-0 h-2.5 w-2.5 rounded-full bg-blue-600 ring-2 ring-white" />
              )}
            </button>

            {msgOpen && (
              <div className="absolute right-0 mt-3 w-80 bg-white border border-slate-200 rounded-lg shadow-xl overflow-hidden z-50">
                <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
                  <h3 className="text-sm font-semibold text-slate-800">Messages</h3>
                </div>

                {/* Body */}
                <div className="max-h-96 overflow-auto divide-y divide-gray-100">
                  {messages.length === 0 ? (
                    <div className="p-4">
                      <p className="text-sm text-gray-300 text-center">No new messages</p>
                    </div>
                  ) : (
                    visibleMessages.map((m, i) => (
                      <div key={i} className="p-3">
                        <div className="flex items-start gap-2">
                          {!m.read && <span className="mt-1.5 h-2 w-2 rounded-full bg-blue-600 flex-shrink-0" />}
                          <div className="min-w-0">
                            <div className="text-sm text-slate-700">
                              {m.message}{" "}
                              {m.link && (
                                <button
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    // mark the specific message read
                                    const idx = messages.indexOf(m);
                                    if (idx > -1) {
                                      await apiFetch(`${API_BASE}/api/auth/notifications/${idx}/read`, {
                                        method: "POST",
                                      }).catch(() => { });
                                    }
                                    window.location.href = m.link;
                                  }}
                                  className="text-emerald-600 hover:text-emerald-700 underline underline-offset-2 ml-1"
                                >
                                  View Dashboard
                                </button>
                              )}
                            </div>
                            <button
                              onClick={async () => {
                                await apiFetch(`${API_BASE}/api/auth/notifications/${i}`, {
                                  method: "DELETE",
                                });
                                setMessages(prev => prev.filter((_, j) => j !== i));
                              }}
                              className="text-red-400 hover:text-red-300 text-xs ml-2"
                            >
                              Delete
                            </button>
                            {!!m.createdAt && (
                              <div className="mt-1 text-[10px] text-gray-400">
                                {new Date(m.createdAt).toLocaleString()}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Footer: View all / Show less */}
                <div className="p-3 border-t border-gray-100">
                  {messages.length > 1 ? (
                    <button
                      className="w-full text-xs text-emerald-600 hover:text-emerald-700 font-medium"
                      onClick={() => setShowAllMsgs((v) => !v)}
                    >
                      {showAllMsgs ? "Show less" : "View all messages"}
                    </button>
                  ) : (
                    // no empty space when there's 0 or 1 message
                    <div className="h-0" />
                  )}
                </div>
              </div>
            )}

          </div>

          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => {
                setNotifOpen((v) => !v);
                setMsgOpen(false);
                setSettingsOpen(false);
                setDiscoverOpen(false);
                setSolutionsOpen(false);
                setProfileOpen(false);
              }}
              className={`text-slate-500 hover:text-slate-900 transition-all duration-200 p-2 rounded-md hover:bg-slate-100 relative ${notifOpen ? 'bg-blue-50 text-blue-700' : ''
                }`}
            >
              <FaRegBell size={20} />
            </button>
            {notifOpen && (
              <div className="absolute right-0 mt-3 w-72 bg-white border border-slate-200 rounded-lg shadow-xl overflow-hidden z-20">
                <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
                  <h3 className="text-sm font-semibold text-slate-800">Notifications</h3>
                </div>
                <div className="p-8 text-center">
                  <p className="text-sm text-slate-500">No new notifications</p>
                </div>
              </div>
            )}
          </div>

          {/* Settings */}
          <div className="relative">
            <button
              onClick={() => {
                setSettingsOpen((v) => !v);
                setMsgOpen(false);
                setNotifOpen(false);
                setDiscoverOpen(false);
                setSolutionsOpen(false);
                setProfileOpen(false);
              }}
              className="text-slate-500 hover:text-slate-900 transition-all duration-200 p-2 rounded-md hover:bg-slate-100"
            >
              <FiSettings size={20} />
            </button>
            {settingsOpen && (
              <div className="absolute right-0 mt-3 w-48 bg-white border border-slate-200 rounded-lg shadow-xl overflow-hidden z-20">
                <a className="block px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 hover:text-blue-600 border-b border-slate-100 cursor-pointer">
                  Preferences
                </a>
                <a className="block px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 hover:text-blue-600 border-b border-slate-100 cursor-pointer">
                  Account
                </a>
                <a className="block px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 hover:text-blue-600 cursor-pointer">
                  Help & Support
                </a>
              </div>
            )}
          </div>

          {/* Switch Mode Button (Freelance Mode) */}
          <motion.button
            type="button"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              try { sessionStorage.setItem("lastHomeRoute", "/sponsorshiphome"); } catch { }
              navigate("/home");
            }}
            className="group relative inline-flex items-center gap-2 overflow-hidden rounded-md px-4 py-2 text-sm font-medium text-white transition-all duration-300 bg-slate-800 hover:bg-slate-900 shadow-sm hover:shadow-md"
          >
            <span className="relative z-10 flex items-center gap-2">
              <motion.svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                className="h-4 w-4 text-sky-400"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                <line x1="12" y1="22.08" x2="12" y2="12" />
              </motion.svg>
              <span>Freelance Mode</span>
            </span>
          </motion.button>


          {/* Dashboard button */}
          <button
            className="bg-blue-600 hover:bg-blue-700 px-5 py-2 rounded-md text-white font-medium transition-all duration-200 shadow-sm hover:shadow-md hover:translate-y-[-1px]"
            onClick={() => (window.location.href = "/dashboard")}
          >
            Dashboard
          </button>

          {/* Profile */}
          <div className="relative">
            <button
              onClick={() => {
                setProfileOpen((v) => !v);
                setMsgOpen(false);
                setNotifOpen(false);
                setSettingsOpen(false);
                setDiscoverOpen(false);
                setSolutionsOpen(false);
              }}
              className="flex items-center justify-center h-9 w-9 rounded-full border border-gray-200 bg-gray-50 overflow-hidden hover:bg-gray-100 transition ring-2 ring-transparent hover:ring-emerald-200"
              aria-label="Profile"
              title={user?.name || user?.email || "Profile"}
            >
              {safeAvatarUrl ? (
                <img src={safeAvatarUrl} alt="Profile" className="h-full w-full object-cover" />
              ) : (
                <span className="text-sm font-semibold text-emerald-700">{initial}</span>
              )}
            </button>

            {profileOpen && (
              <div className="absolute right-0 mt-3 w-44 bg-white border border-gray-200 rounded-2xl shadow-xl overflow-hidden z-20">
                <a
                  className="block px-4 py-3 text-sm text-gray-600 hover:bg-emerald-50 hover:text-emerald-700 cursor-pointer"
                  onClick={() => (window.location.href = "/profile")}
                >
                  View Profile
                </a>
                <a
                  className="block px-4 py-3 text-sm text-red-600 hover:bg-red-50 cursor-pointer"
                  onClick={async () => {
                    try {
                      await apiFetch(`${API_BASE}/api/auth/signout`, {
                        method: "POST",
                      });
                    } catch {
                      // ignore
                    }
                    clearLegacyClientAuth();
                    navigate("/signin", { replace: true });
                  }}
                >
                  Sign Out
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Mobile actions (Dashboard + Profile + Menu) */}
        <div className="lg:hidden flex items-center space-x-3">
          {/* Dashboard button always visible */}
          <button
            className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 px-3 py-1.5 rounded-xl text-white font-semibold transition-all duration-200 shadow-lg hover:shadow-purple-500/25"
            onClick={() => (window.location.href = "/dashboard")}
          >
            Dashboard
          </button>

          {/* Profile */}
          {/* Profile button (mobile + desktop) */}
          <div className="relative">
            <button
              onClick={() => setProfileOpen((v) => !v)}
              className="flex items-center justify-center h-9 w-9 rounded-full border border-white/20 bg-white/10 overflow-hidden hover:bg-white/15 transition"
              aria-label="Profile"
              title={user?.name || user?.email || "Profile"}
            >
              {safeAvatarUrl ? (
                <img src={safeAvatarUrl} alt="Profile" className="h-full w-full object-cover" />
              ) : (
                <span className="text-sm font-semibold text-white/90">{initial}</span>
              )}
            </button>

            {/* Profile dropdown - floats below avatar */}
            {profileOpen && (
              <div className="absolute right-0 mt-3 w-48 bg-white border border-gray-200 shadow-xl rounded-xl z-50 backdrop-blur-md p-2 animate-fadeIn">
                <a
                  onClick={() => {
                    setProfileOpen(false);
                    window.location.href = "/profile";
                  }}
                  className="block px-4 py-2 text-sm text-gray-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-md cursor-pointer transition"
                >
                  👤 View Profile
                </a>
                <a
                  onClick={async () => {
                    setProfileOpen(false);
                    try {
                      await apiFetch(`${API_BASE}/api/auth/signout`, {
                        method: "POST",
                      });
                    } catch {
                      console.error();
                    }
                    clearLegacyClientAuth();
                    navigate("/signin", { replace: true });
                  }}
                  className="block px-4 py-2 text-sm text-red-500 hover:text-red-700 hover:bg-red-50 rounded-md cursor-pointer transition"
                >
                  🚪 Sign Out
                </a>
              </div>
            )}
          </div>


          {/* Hamburger menu toggle */}
          <button
            className="p-2 rounded-lg text-gray-600 hover:text-emerald-700 hover:bg-gray-100 transition"
            onClick={() => setMobileMenuOpen((v) => !v)}
          >
            {mobileMenuOpen ? <FiX size={22} /> : <FiMenu size={22} />}
          </button>
        </div>


      </div>
      {/* Step 3: Mobile dropdown menu */}
      {mobileMenuOpen && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.25, ease: "easeInOut" }}
          className="lg:hidden absolute top-full left-0 right-0 bg-white border-t border-gray-100 shadow-xl rounded-b-2xl"
        >
          <div className="flex flex-col space-y-4 p-5 text-gray-700">

            {/* Search bar */}
            <div className="flex items-center bg-gray-100 rounded-full px-4 py-2 shadow-inner focus-within:ring-2 focus-within:ring-emerald-500/20">
              <FiSearch className="text-gray-400 mr-2" />
              <input
                type="text"
                placeholder="Search..."
                className="bg-transparent outline-none text-sm text-gray-700 w-full placeholder-gray-400"
              />
            </div>
            {/* About Dropdown */}
            <div className="relative">
              <button
                onClick={() => {
                  setDiscoverOpen((v) => !v);
                  setSolutionsOpen(false);
                  setMsgOpen(false);
                  setNotifOpen(false);
                  setSettingsOpen(false);
                  setProfileOpen(false);
                }}
                className="flex items-center justify-between w-full px-3 py-2 bg-gray-50 rounded-xl hover:bg-gray-100 transition-all duration-200 font-medium text-gray-700"
              >
                <span>About</span>
                <FiChevronDown
                  className={`ml-1 transition-transform duration-200 ${discoverOpen ? "rotate-180 text-emerald-600" : ""
                    }`}
                />
              </button>

              <AnimatePresence>
                {discoverOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="mt-2 bg-white border border-gray-200 rounded-2xl shadow-lg overflow-hidden"
                  >
                    {["About Us", "Team", "Join Us", "Contact"].map((t, i) => {
                      const paths = ["/about-us", "/team", "/join-us", "/contact"];
                      return (
                        <Link
                          key={i}
                          to={paths[i]}
                          className="block px-5 py-3 text-sm text-gray-600 hover:bg-emerald-50 hover:text-emerald-700 transition-colors border-b border-gray-100 last:border-0"
                        >
                          {t}
                        </Link>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Explore Dropdown */}
            <div className="relative">
              <button
                onClick={() => {
                  setSolutionsOpen((v) => !v);
                  setDiscoverOpen(false);
                  setMsgOpen(false);
                  setNotifOpen(false);
                  setSettingsOpen(false);
                  setProfileOpen(false);
                }}
                className="flex items-center justify-between w-full px-3 py-2 bg-gray-50 rounded-xl hover:bg-gray-100 transition-all duration-200 font-medium text-gray-700"
              >
                <span>Explore</span>
                <FiChevronDown
                  className={`ml-1 transition-transform duration-200 ${solutionsOpen ? "rotate-180 text-emerald-600" : ""
                    }`}
                />
              </button>

              <AnimatePresence>
                {solutionsOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="mt-2 bg-white border border-gray-200 rounded-2xl shadow-lg overflow-hidden"
                  >
                    {["How It Works", "Pricing & Plans", "Escrow Policy", "Help Center"].map((t, i) => {
                      const paths = ["/how-it-works", "/pricing", "/escrow-policy", "/help"];
                      return (
                        <Link
                          key={i}
                          to={paths[i]}
                          className="block px-5 py-3 text-sm text-gray-600 hover:bg-emerald-50 hover:text-emerald-700 transition-colors border-b border-gray-100 last:border-0"
                        >
                          {t}
                        </Link>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Messages */}
            <button
              onClick={() => setMsgOpen((v) => !v)}
              className="flex items-center justify-between w-full px-3 py-2 bg-gray-50 rounded-xl hover:bg-gray-100 transition-all duration-200 font-medium text-gray-700"
            >
              <span>Messages</span>
              {unreadCount > 0 && (
                <span className="ml-1 text-xs text-emerald-600">({unreadCount})</span>
              )}
            </button>
            {msgOpen && (
              <div className="pl-4 space-y-1 text-sm mt-2">
                {messages.length === 0 ? (
                  <p className="text-gray-400">No new messages</p>
                ) : (
                  visibleMessages.map((m, i) => (
                    <div key={i} className="py-1">
                      <span className="text-gray-800">{m.message}</span>
                      {m.link && (
                        <button
                          onClick={() => (window.location.href = m.link)}
                          className="text-emerald-600 hover:text-emerald-700 underline underline-offset-2 ml-1"
                        >
                          View
                        </button>
                      )}
                    </div>
                  ))
                )}
                {messages.length > 1 && (
                  <button
                    className="text-emerald-600 hover:text-emerald-700 text-xs"
                    onClick={() => setShowAllMsgs((v) => !v)}
                  >
                    {showAllMsgs ? "Show less" : "View all messages"}
                  </button>
                )}
              </div>
            )}

            {/* Notifications */}
            <button
              onClick={() => setNotifOpen((v) => !v)}
              className="flex items-center justify-between w-full px-3 py-2 bg-gray-50 rounded-xl hover:bg-gray-100 transition-all duration-200 font-medium text-gray-700"
            >
              <span>Notifications</span>
            </button>
            {notifOpen && (
              <div className="pl-4 text-sm text-gray-400 mt-2">
                No new notifications
              </div>
            )}

            {/* Settings */}
            <button
              onClick={() => setSettingsOpen((v) => !v)}
              className="flex items-center justify-between w-full px-3 py-2 bg-gray-50 rounded-xl hover:bg-gray-100 transition-all duration-200 font-medium text-gray-700"
            >
              <span>Settings</span>
            </button>
            {settingsOpen && (
              <div className="pl-4 space-y-1 text-sm mt-2">
                <a className="block hover:text-emerald-700 text-gray-600 cursor-pointer">Preferences</a>
                <a className="block hover:text-emerald-700 text-gray-600 cursor-pointer">Account</a>
                <a className="block hover:text-emerald-700 text-gray-600 cursor-pointer">Help & Support</a>
              </div>
            )}

          </div>

        </motion.div>
      )}
    </header>
  );
}
