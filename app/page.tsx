"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { useApp, UserSetup } from "@/lib/context";

const BRAND_BLUE = "#2B7EC9";
const BRAND_ORANGE = "#F5A623";

const BUSINESS_TYPES = [
  {
    value: "physical_product",
    label: "Physical Product",
    sub: "Tangible goods, shipping, or retail inventory.",
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>,
  },
  {
    value: "service",
    label: "Service",
    sub: "Professional expertise, labor, or consulting.",
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  },
  {
    value: "digital",
    label: "Digital",
    sub: "SaaS, online courses, software, or digital assets.",
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>,
  },
];

const STAGES = [
  { value: "just_starting", label: "Just Starting", sub: "No Facebook Page yet, never run ads" },
  { value: "have_page", label: "Have a Page", sub: "Set up but no campaigns yet" },
  { value: "running_ads", label: "Running Ads", sub: "Have campaigns, want better results" },
];

const LANGUAGES = [
  { value: "Taglish", label: "Taglish", sub: "Tagalog + English" },
  { value: "Bislish", label: "Bislish", sub: "Bisaya + English" },
  { value: "Filipino", label: "Filipino", sub: "National language" },
  { value: "Bisaya", label: "Bisaya", sub: "Visayas & Mindanao" },
  { value: "Ilocano", label: "Ilocano", sub: "Northern Luzon" },
  { value: "Hiligaynon", label: "Hiligaynon", sub: "Western Visayas" },
  { value: "Kapampangan", label: "Kapampangan", sub: "Pampanga area" },
  { value: "English", label: "English", sub: "Global / formal" },
];

export default function SetupPage() {
  const { setup, setSetup } = useApp();
  const router = useRouter();

  const [form, setForm] = useState<UserSetup>(setup || {
    businessName: "",
    product: "",
    targetAudience: "",
    uniqueSellingOffer: "",
    market: "Philippines",
    businessType: "physical_product",
    stage: "just_starting",
    language: "Taglish",
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSetup(form);
    router.push("/research");
  }

  function handleSaveDraft() {
    setSetup(form);
  }

  const { setResearchOutput, setAnglesOutput, setCopyOutput, setSelectedAngle } = useApp();
  const [clearing, setClearing] = useState(false);

  async function handleClearData() {
    if (!confirm("Clear all your setup, research, angles, and copy data? This cannot be undone.")) return;
    setClearing(true);
    const blankSetup: UserSetup = {
      businessName: "", product: "", targetAudience: "", uniqueSellingOffer: "",
      market: "Philippines", businessType: "physical_product", stage: "just_starting", language: "Taglish",
    };
    setForm(blankSetup);
    setSetup(blankSetup);
    setResearchOutput("");
    setAnglesOutput("");
    setCopyOutput("");
    setSelectedAngle("");
    setClearing(false);
  }

  const [notifOpen, setNotifOpen] = useState(false);
  const [notifSeen, setNotifSeen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const setupDone = !!(setup?.businessName);

  const NOTIFICATIONS = [
    { id: 1, type: "credit", icon: "⚡", title: "5 credits added", desc: "Welcome bonus applied to your account.", time: "Just now" },
    { id: 2, type: "news", icon: "📢", title: "New: Campaign Setup Guide", desc: "Step-by-step Messenger Ads module is now live.", time: "2 days ago" },
    { id: 3, type: "news", icon: "🎨", title: "Creative Studio upgraded", desc: "Now supports 3 aspect ratios and variations.", time: "5 days ago" },
  ];

  // Persist notification seen state in localStorage so it survives logout/login
  useEffect(() => {
    const seen = localStorage.getItem("hinilas_notif_seen");
    if (seen === "true") setNotifSeen(true);
  }, []);

  function handleOpenNotif() {
    setNotifOpen(o => !o);
    if (!notifSeen) {
      setNotifSeen(true);
      localStorage.setItem("hinilas_notif_seen", "true");
    }
  }

  const unreadCount = notifSeen ? 0 : 1;

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "#0B1120" }}>
      <Sidebar />

      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Top bar */}
        <div className="hidden md:flex items-center justify-end gap-4 px-6 py-3 shrink-0" style={{ background: "#0F172A", borderBottom: "1px solid #1E2D45" }}>

          {/* Notification bell */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={handleOpenNotif}
              className="relative flex items-center justify-center w-9 h-9 rounded-xl transition-all hover:opacity-80"
              style={{ background: "#0B1120", border: "1px solid #1E2D45" }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
              {unreadCount > 0 && !notifSeen && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-white" style={{ background: "#EF4444" }}>{unreadCount}</span>
              )}
            </button>

            {notifOpen && (
              <div className="absolute right-0 top-11 w-80 rounded-2xl shadow-2xl z-50 overflow-hidden" style={{ background: "#0F172A", border: "1px solid #1E2D45" }}>
                <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: "1px solid #1E2D45" }}>
                  <span className="text-white text-sm font-bold">Notifications</span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: "rgba(43,126,201,0.15)", color: "#2B7EC9" }}>{NOTIFICATIONS.length} total</span>
                </div>
                <div className="divide-y" style={{ borderColor: "#1E2D45" }}>
                  {NOTIFICATIONS.map((n, i) => {
                    const isUnread = i === 0 && !notifSeen;
                    return (
                      <div key={n.id} className="px-4 py-3 flex items-start gap-3" style={{ background: isUnread ? "rgba(43,126,201,0.05)" : "transparent" }}>
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center text-base shrink-0" style={{ background: "#1E2D45" }}>{n.icon}</div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-white text-xs font-semibold">{n.title}</p>
                            {isUnread && <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: "#2B7EC9" }} />}
                          </div>
                          <p className="text-xs mt-0.5" style={{ color: "#64748B" }}>{n.desc}</p>
                          <p className="text-[10px] mt-1" style={{ color: "#334155" }}>{n.time}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Launch AI button */}
          <button
            onClick={() => router.push("/research")}
            className="relative flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all hover:brightness-110"
            style={{
              background: BRAND_BLUE,
              color: "#fff",
              boxShadow: !setupDone ? "0 0 16px rgba(43,126,201,0.6), 0 0 32px rgba(43,126,201,0.3)" : "none",
              animation: !setupDone ? "launchGlow 2s ease-in-out infinite alternate" : "none",
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
            Launch AI
          </button>

          <style>{`
            @keyframes launchGlow {
              0% { box-shadow: 0 0 12px rgba(43,126,201,0.5), 0 0 24px rgba(43,126,201,0.2); }
              100% { box-shadow: 0 0 24px rgba(43,126,201,0.8), 0 0 48px rgba(43,126,201,0.4); }
            }
          `}</style>
        </div>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto pt-14 md:pt-0 pb-32">
          <div className="max-w-2xl mx-auto px-6 py-8">

            {/* Step indicator */}
            <div className="flex items-center gap-3 mb-8">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ background: BRAND_BLUE }}>1</div>
                <span className="text-sm font-semibold" style={{ color: BRAND_BLUE }}>Intelligence Setup</span>
              </div>
              <div className="flex-1 h-px max-w-[60px]" style={{ background: "#1E2D45" }} />
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: "#1E2D45", color: "#475569" }}>2</div>
                <span className="text-sm font-medium" style={{ color: "#475569" }}>Market Analysis</span>
              </div>
            </div>

            {/* Header */}
            <div className="mb-8">
              <h1 className="text-2xl font-black text-white mb-2">Business Intelligence Profile</h1>
              <p className="text-sm leading-relaxed" style={{ color: "#64748B" }}>
                Tell us about your business to power your AI-driven marketing engine. Our intelligence models use these details to craft high-conversion strategies.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">

              {/* Business Nature */}
              <div>
                <label className="block text-[10px] font-bold tracking-widest uppercase mb-3" style={{ color: "#94A3B8" }}>Business Nature</label>
                <div className="grid grid-cols-3 gap-3">
                  {BUSINESS_TYPES.map(opt => {
                    const active = form.businessType === opt.value as UserSetup["businessType"];
                    return (
                      <button
                        type="button"
                        key={opt.value}
                        onClick={() => setForm({ ...form, businessType: opt.value as UserSetup["businessType"] })}
                        className="relative p-4 rounded-xl text-left transition-all"
                        style={active
                          ? { background: "rgba(43,126,201,0.12)", border: `1px solid ${BRAND_BLUE}`, color: "#fff" }
                          : { background: "#0F172A", border: "1px solid #1E2D45", color: "#64748B" }
                        }
                      >
                        {active && (
                          <div className="absolute top-2 right-2 w-4 h-4 rounded-full flex items-center justify-center" style={{ background: BRAND_BLUE }}>
                            <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                          </div>
                        )}
                        <div className="mb-2" style={{ color: active ? BRAND_BLUE : "#475569" }}>{opt.icon}</div>
                        <p className="text-xs font-bold mb-0.5" style={{ color: active ? "#fff" : "#94A3B8" }}>{opt.label}</p>
                        <p className="text-[10px] leading-relaxed" style={{ color: active ? "#64A4D8" : "#334155" }}>{opt.sub}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Business Name + Market */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold tracking-widest uppercase mb-2" style={{ color: "#94A3B8" }}>Business / Brand Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Hinilas Pro"
                    value={form.businessName}
                    onChange={e => setForm({ ...form, businessName: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none transition-all"
                    style={{ background: "#0F172A", border: "1px solid #1E2D45" }}
                    onFocus={e => e.target.style.borderColor = BRAND_BLUE}
                    onBlur={e => e.target.style.borderColor = "#1E2D45"}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold tracking-widest uppercase mb-2" style={{ color: "#94A3B8" }}>Market / Location</label>
                  <input
                    type="text"
                    placeholder="e.g. Global, North America"
                    value={form.market}
                    onChange={e => setForm({ ...form, market: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none transition-all"
                    style={{ background: "#0F172A", border: "1px solid #1E2D45" }}
                    onFocus={e => e.target.style.borderColor = BRAND_BLUE}
                    onBlur={e => e.target.style.borderColor = "#1E2D45"}
                  />
                </div>
              </div>

              {/* Product */}
              <div>
                <label className="block text-[10px] font-bold tracking-widest uppercase mb-2" style={{ color: "#94A3B8" }}>What Are You Selling?</label>
                <textarea
                  required
                  rows={2}
                  placeholder="Describe your main product or offering..."
                  value={form.product}
                  onChange={e => setForm({ ...form, product: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none resize-none transition-all"
                  style={{ background: "#0F172A", border: "1px solid #1E2D45" }}
                  onFocus={e => e.target.style.borderColor = BRAND_BLUE}
                  onBlur={e => e.target.style.borderColor = "#1E2D45"}
                />
              </div>

              {/* Target Audience */}
              <div>
                <label className="block text-[10px] font-bold tracking-widest uppercase mb-2" style={{ color: "#94A3B8" }}>Who Is Your Target Customer?</label>
                <input
                  type="text"
                  required
                  placeholder="Define your ideal persona (e.g. Mid-level marketers in tech)..."
                  value={form.targetAudience}
                  onChange={e => setForm({ ...form, targetAudience: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none transition-all"
                  style={{ background: "#0F172A", border: "1px solid #1E2D45" }}
                  onFocus={e => e.target.style.borderColor = BRAND_BLUE}
                  onBlur={e => e.target.style.borderColor = "#1E2D45"}
                />
              </div>

              {/* USP */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-[10px] font-bold tracking-widest uppercase" style={{ color: "#475569" }}>Unique Selling Offer (USP)</label>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded" style={{ background: "rgba(245,166,35,0.1)", color: BRAND_ORANGE, border: `1px solid ${BRAND_ORANGE}30` }}>AI Optimized</span>
                </div>
                <textarea
                  rows={3}
                  placeholder="What makes you stand out from the competition?"
                  value={form.uniqueSellingOffer}
                  onChange={e => setForm({ ...form, uniqueSellingOffer: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none resize-none transition-all"
                  style={{ background: "#0F172A", border: "1px solid #1E2D45" }}
                  onFocus={e => e.target.style.borderColor = BRAND_BLUE}
                  onBlur={e => e.target.style.borderColor = "#1E2D45"}
                />
                <p className="text-xs mt-1.5" style={{ color: "#64748B" }}>Include price, freebies, guarantee, urgency — anything that makes them act.</p>
              </div>

              {/* Stage */}
              <div>
                <label className="block text-[10px] font-bold tracking-widest uppercase mb-3" style={{ color: "#94A3B8" }}>Where Are You Now?</label>
                <div className="space-y-2">
                  {STAGES.map(opt => {
                    const active = form.stage === opt.value as UserSetup["stage"];
                    return (
                      <button
                        type="button"
                        key={opt.value}
                        onClick={() => setForm({ ...form, stage: opt.value as UserSetup["stage"] })}
                        className="w-full p-3.5 rounded-xl text-left flex items-center justify-between transition-all"
                        style={active
                          ? { background: "rgba(43,126,201,0.12)", border: `1px solid ${BRAND_BLUE}` }
                          : { background: "#0F172A", border: "1px solid #1E2D45" }
                        }
                      >
                        <div>
                          <p className="text-sm font-semibold" style={{ color: active ? "#fff" : "#94A3B8" }}>{opt.label}</p>
                          <p className="text-xs" style={{ color: active ? "#64A4D8" : "#334155" }}>{opt.sub}</p>
                        </div>
                        <div className="w-5 h-5 rounded-full shrink-0 flex items-center justify-center" style={{ background: active ? BRAND_BLUE : "#1E2D45" }}>
                          {active && <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Language */}
              <div>
                <label className="block text-[10px] font-bold tracking-widest uppercase mb-1.5" style={{ color: "#475569" }}>Language / Dialect</label>
                <p className="text-xs mb-3" style={{ color: "#64748B" }}>How the AI responds and how ad copy sounds to your target market.</p>
                <div className="grid grid-cols-2 gap-2">
                  {LANGUAGES.map(opt => {
                    const active = form.language === opt.value;
                    return (
                      <button
                        type="button"
                        key={opt.value}
                        onClick={() => setForm({ ...form, language: opt.value })}
                        className="p-3 rounded-xl text-left transition-all"
                        style={active
                          ? { background: "rgba(43,126,201,0.12)", border: `1px solid ${BRAND_BLUE}` }
                          : { background: "#0F172A", border: "1px solid #1E2D45" }
                        }
                      >
                        <p className="text-xs font-semibold" style={{ color: active ? "#fff" : "#94A3B8" }}>{opt.label}</p>
                        <p className="text-[10px]" style={{ color: active ? "#64A4D8" : "#334155" }}>{opt.sub}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

            </form>
          </div>
        </main>

        {/* Sticky bottom bar — sits above chat button (chat is bottom-6 right-6, ~80px) */}
        <div className="fixed bottom-0 left-0 right-0 md:left-60 md:right-24 px-6 py-3 flex items-center justify-between z-30" style={{ background: "rgba(15,23,42,0.95)", borderTop: "1px solid #1E2D45", backdropFilter: "blur(12px)", borderRadius: "0 0 0 0" }}>
          <div className="flex items-center gap-2 text-xs" style={{ color: "#334155" }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            <span>Your data is encrypted and used only for strategy generation.</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleClearData}
              disabled={clearing}
              className="px-4 py-2 rounded-xl text-sm font-semibold transition-all hover:opacity-80"
              style={{ background: "#0F172A", border: "1px solid #EF444440", color: "#EF4444" }}
            >
              Clear Data
            </button>
            <button
              type="button"
              onClick={handleSaveDraft}
              className="px-4 py-2 rounded-xl text-sm font-semibold transition-all hover:opacity-80"
              style={{ background: "#0F172A", border: "1px solid #1E2D45", color: "#94A3B8" }}
            >
              Save Draft
            </button>
            <button
              type="submit"
              onClick={handleSubmit}
              className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold transition-all hover:brightness-110"
              style={{ background: BRAND_BLUE, color: "#fff" }}
            >
              Generate Strategy
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
