"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import { useApp } from "@/lib/context";
import { HinilasIcon } from "@/components/HinilasLogo";
import FloatingExpert from "@/components/FloatingExpert";
import FloatingFeedback from "@/components/FloatingFeedback";
import { createClient } from "@/lib/supabase/client";
import Image from "next/image";

const NAV_ITEMS = [
  {
    href: "/", label: "Setup", desc: "Business profile",
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/></svg>,
  },
  {
    href: "/research", label: "Research", desc: "Know your customer",
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>,
  },
  {
    href: "/angles", label: "Angles", desc: "Find winning angles",
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
  },
  {
    href: "/creative", label: "Creative", desc: "Generate ad images",
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>,
  },
  {
    href: "/copy", label: "Sales Copy", desc: "Write your captions",
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>,
  },
  {
    href: "/campaign-setup", label: "Campaign Setup", desc: "Build your campaign",
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 2L11 13"/><path d="M22 2 15 22 11 13 2 9l20-7z"/></svg>,
  },
  {
    href: "/analyze", label: "Analyze", desc: "Read your results",
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
  },
  {
    href: "/learn", label: "Courses", desc: "Marketing education",
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>,
  },
];

function LiveStats() {
  const [online, setOnline] = useState(47);
  const [total, setTotal] = useState(1243);
  useEffect(() => {
    const interval = setInterval(() => {
      setOnline(prev => Math.max(10, prev + (Math.random() > 0.5 ? 1 : -1) * Math.floor(Math.random() * 3)));
      setTotal(prev => Math.random() > 0.85 ? prev + 1 : prev);
    }, 3000);
    return () => clearInterval(interval);
  }, []);
  return (
    <div className="flex items-center gap-3 px-4 py-2 mx-3 mt-2 mb-1 rounded-lg" style={{ background: "#0A0F1A" }}>
      <div className="flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        <span className="text-emerald-400 text-xs font-medium">{online} online</span>
      </div>
      <span className="text-gray-600 text-xs">·</span>
      <span className="text-gray-400 text-xs">{total.toLocaleString()} users</span>
    </div>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { credits, creditsTotal, plan, setup, researchOutput, anglesOutput, copyOutput, savedImages } = useApp();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [expertOpen, setExpertOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [earnOpen, setEarnOpen] = useState(false);
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [referralStats, setReferralStats] = useState<{ total: number; credits: number; history: { description: string; amount: number; created_at: string }[] } | null>(null);
  const [leaderboard, setLeaderboard] = useState<{ rank: number; username: string; avatar_url: string | null; credits: number }[]>([]);
  const [user, setUser] = useState<{ name: string; avatar: string } | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUser({
          name: user.user_metadata?.full_name || user.email || "User",
          avatar: user.user_metadata?.avatar_url || "",
        });
      }
    });
  }, []);

  function openEarn() {
    setEarnOpen(true);
    setMobileOpen(false);
    if (!referralCode) {
      fetch("/api/referral").then(r => r.json()).then(d => {
        if (d.referralCode) setReferralCode(d.referralCode);
      });
    }
    fetch("/api/referral/stats").then(r => r.json()).then(d => {
      if (!d.error) setReferralStats(d);
    });
    fetch("/api/referral/leaderboard").then(r => r.json()).then(d => {
      if (d.leaderboard) setLeaderboard(d.leaderboard);
    });
  }

  function getReferralLink() {
    if (!referralCode) return "";
    return `${window.location.origin}/ref/${referralCode}`;
  }

  function copyLink() {
    navigator.clipboard.writeText(getReferralLink());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/home");
    router.refresh();
  }

  const creditPct = Math.min((credits / Math.max(creditsTotal, 1)) * 100, 100);
  const planColor = plan === "max" ? "#EF4444" : plan === "flex" ? "#F5A623" : "#9CA3AF";
  const planLabel = plan === "max" ? "Max Plan" : plan === "flex" ? "Flex Plan" : "Lite Plan";
  const planSuffix = plan === "max" ? "Max" : plan === "flex" ? "Flex" : "Lite";

  // Completion signals per nav item
  const completionMap: Record<string, boolean> = {
    "/": !!(setup?.businessName),
    "/research": !!(researchOutput),
    "/angles": !!(anglesOutput),
    "/creative": !!(savedImages?.main),
    "/copy": !!(copyOutput),
  };

  // Lock map — each route requires the previous step to be done
  const lockMap: Record<string, { locked: boolean; message: string }> = {
    "/research": { locked: !setup?.businessName, message: "Complete your Setup first." },
    "/angles":   { locked: !researchOutput,       message: "Run Research first." },
    "/creative": { locked: !anglesOutput,          message: "Generate Angles first." },
    "/copy":     { locked: !savedImages?.main,     message: "Generate a Creative first." },
    "/campaign-setup": { locked: false, message: "" },
    "/analyze":  { locked: false, message: "" },
    "/learn":    { locked: false, message: "" },
  };

  const [lockToast, setLockToast] = useState<string | null>(null);
  const showLockToast = useCallback((msg: string) => {
    setLockToast(msg);
    setTimeout(() => setLockToast(null), 2500);
  }, []);

  const SidebarContent = () => (
    <div className="flex flex-col h-full overflow-hidden">

      {/* Logo */}
      <div className="px-5 py-4 shrink-0 pr-10" style={{ borderBottom: "1px solid #1E2D45" }}>
        <div className="flex items-center gap-3">
          <HinilasIcon size="md" accentColor={planColor} />
          <div>
            <div className="flex items-baseline gap-0">
              <span className="text-white font-bold text-base">Hinilas</span>
              <span className="font-bold text-base" style={{ color: planColor }}>{planSuffix}</span>
            </div>
            <p className="text-[9px] font-bold tracking-widest uppercase" style={{ color: "#2B7EC9" }}>Marketing Intelligence</p>
          </div>
        </div>
      </div>

      {/* Live stats */}
      <LiveStats />

      {/* Nav */}
      <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href;
          const done = completionMap[item.href] ?? false;
          const lock = lockMap[item.href];
          const isLocked = lock?.locked ?? false;
          return (
            <Link
              key={item.href}
              href={isLocked ? "#" : item.href}
              onClick={(e) => {
                if (isLocked) {
                  e.preventDefault();
                  showLockToast(lock.message);
                  return;
                }
                setMobileOpen(false);
              }}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all group"
              style={active
                ? { background: "rgba(43,126,201,0.15)", borderLeft: "2px solid #2B7EC9", paddingLeft: "10px" }
                : isLocked
                ? { borderLeft: "2px solid transparent", opacity: 0.45, cursor: "not-allowed" }
                : { borderLeft: "2px solid transparent" }
              }
            >
              <span style={{ color: active ? "#2B7EC9" : "#64748B" }} className="shrink-0 group-hover:text-white transition-colors">
                {item.icon}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium" style={{ color: active ? "#fff" : "#CBD5E1" }}>{item.label}</p>
                <p className="text-xs truncate" style={{ color: "#64748B" }}>{item.desc}</p>
              </div>
              {isLocked ? (
                <div className="shrink-0">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2.5"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                </div>
              ) : done && !active ? (
                <div className="shrink-0 w-4 h-4 rounded-full flex items-center justify-center" style={{ background: "#052e16" }}>
                  <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                </div>
              ) : null}
            </Link>
          );
        })}

        {/* Divider */}
        <div className="my-2" style={{ borderTop: "1px solid #1E2D45" }} />

        {/* Consultation — Coming Soon */}
        <div
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-not-allowed opacity-50"
          style={{ borderLeft: "2px solid transparent" }}
        >
          <span style={{ color: "#64748B" }} className="shrink-0">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          </span>
          <div className="min-w-0 flex-1 text-left">
            <p className="text-sm font-medium" style={{ color: "#CBD5E1" }}>Consultation</p>
            <p className="text-xs" style={{ color: "#64748B" }}>100 credits / session</p>
          </div>
          <span className="shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: "#1E2D45", color: "#475569" }}>Soon</span>
        </div>

        {/* Feedback button */}
        <button
          onClick={() => setFeedbackOpen(true)}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all group"
          style={{ borderLeft: "2px solid transparent" }}
        >
          <span style={{ color: "#64748B" }} className="shrink-0 group-hover:text-white transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          </span>
          <div className="min-w-0 flex-1 text-left">
            <p className="text-sm font-medium" style={{ color: "#CBD5E1" }}>Feedback</p>
            <p className="text-xs" style={{ color: "#64748B" }}>Share thoughts</p>
          </div>
          <span className="shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: "rgba(34,197,94,0.15)", color: "#22c55e", border: "1px solid rgba(34,197,94,0.3)" }}>+2-15 cr</span>
        </button>
      </nav>

      {/* Footer */}
      <div className="px-4 pb-4 pt-3 shrink-0" style={{ borderTop: "1px solid #1E2D45" }}>

        {/* Usage */}
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-bold tracking-widest uppercase" style={{ color: "#334155" }}>Usage</span>
            <span className="text-xs font-bold" style={{ color: planColor }}>{credits} credits</span>
          </div>
          <div className="w-full rounded-full h-1.5 mb-1" style={{ background: "#1E2D45" }}>
            <div className="h-1.5 rounded-full transition-all" style={{ width: `${creditPct}%`, background: planColor }} />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[10px]" style={{ color: "#334155" }}>0</span>
            <span className="text-[10px]" style={{ color: "#334155" }}>{creditsTotal} total</span>
          </div>
        </div>

        {/* Top up + Earn */}
        <div className="flex gap-1.5 mb-3">
          <button
            onClick={() => { setMobileOpen(false); router.push("/pricing"); }}
            className="flex-1 text-center text-xs font-bold py-1.5 rounded-lg transition-all hover:brightness-110"
            style={{ background: planColor, color: "#000" }}
          >
            Top Up
          </button>
          <button
            onClick={openEarn}
            className="flex-1 text-center text-xs font-semibold py-1.5 rounded-lg transition-all hover:opacity-90"
            style={{ background: "#0D2010", color: "#22c55e", border: "1px solid #22c55e50", boxShadow: "0 0 8px rgba(34,197,94,0.25)" }}
          >
            Earn Credits
          </button>
        </div>

        {/* User profile */}
        {user && (
          <div className="rounded-xl px-3 py-3" style={{ background: "#0F172A", border: "1px solid #1E2D45" }}>
            <div className="flex items-center gap-2.5 mb-2.5">
              {user.avatar ? (
                <Image src={user.avatar} alt={user.name} width={34} height={34} className="rounded-full shrink-0" />
              ) : (
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0" style={{ background: "#2B7EC9" }}>
                  {user.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-white text-sm font-semibold truncate">{user.name.split(" ")[0]}</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="text-[9px] font-black tracking-widest uppercase px-1.5 py-0.5 rounded-full" style={{ background: `${planColor}20`, color: planColor, border: `1px solid ${planColor}40` }}>
                    {plan === "max" ? "Max" : plan === "flex" ? "Flex" : "Lite"}
                  </span>
                  <span className="text-[10px]" style={{ color: "#334155" }}>{credits} cr</span>
                </div>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-all hover:opacity-90"
              style={{ background: "#1E2D45", color: "#94A3B8" }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
              Log Out
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 px-4 py-3 flex items-center justify-between" style={{ background: "#0F172A", borderBottom: "1px solid #1E2D45" }}>
        <div className="flex items-center gap-2">
          <HinilasIcon size="sm" accentColor="#F5A623" />
          <span className="text-white font-bold text-sm">Hinilas<span style={{ color: planColor }}>{planSuffix}</span></span>
        </div>
        <button onClick={() => setMobileOpen(true)} className="text-gray-400 hover:text-white p-1">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
        </button>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-black/60" onClick={() => setMobileOpen(false)} />
      )}

      {/* Mobile drawer */}
      <aside
        className={`md:hidden fixed top-0 left-0 z-50 h-full w-72 transform transition-transform duration-300 ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}
        style={{ background: "rgba(15,23,42,0.92)", backdropFilter: "blur(12px)", borderRight: "1px solid #1E2D45" }}
      >
        {/* Close button — absolute positioned so nav fills full height */}
        <button
          onClick={() => setMobileOpen(false)}
          className="absolute top-3 right-4 z-10 text-gray-500 hover:text-white p-1"
        >✕</button>
        <div className="h-full">
          <SidebarContent />
        </div>
      </aside>

      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-60 flex-col h-full shrink-0" style={{ background: "rgba(15,23,42,0.85)", backdropFilter: "blur(12px)", borderRight: "1px solid #1E2D45" }}>
        <SidebarContent />
      </aside>

      <FloatingExpert isOpen={expertOpen} onClose={() => setExpertOpen(false)} />
      <FloatingFeedback isOpen={feedbackOpen} onClose={() => setFeedbackOpen(false)} />

      {/* Lock toast */}
      {lockToast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[100] px-4 py-2.5 rounded-xl text-sm font-semibold text-white shadow-lg pointer-events-none"
          style={{ background: "#1E293B", border: "1px solid #334155", whiteSpace: "nowrap" }}>
          🔒 {lockToast}
        </div>
      )}

      {/* Earn Credits modal */}
      {earnOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70" onClick={() => setEarnOpen(false)}>
          <div className="w-full max-w-sm rounded-2xl p-6" style={{ background: "#0F172A", border: "1px solid #1E2D45" }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-white font-bold text-base">Earn Credits</h2>
              <button onClick={() => setEarnOpen(false)} className="text-gray-500 hover:text-white text-lg leading-none">✕</button>
            </div>
            <p className="text-gray-400 text-sm mb-4">Share your referral link. When someone signs up and buys credits, you earn automatically.</p>
            <div className="rounded-xl p-4 mb-4" style={{ background: "#0A0F1A", border: "1px solid #1E2D45" }}>
              <p className="text-[10px] text-gray-500 mb-3 font-bold uppercase tracking-widest">Your rewards</p>
              <div className="space-y-2">
                {[
                  ["Referral signs up", "+5 credits"],
                  ["Referral buys Flex (₱499)", "+30 credits"],
                  ["Referral buys Max (₱1,299)", "+75 credits"],
                  ["Referral buys Top-up (₱249)", "+10 credits"],
                ].map(([label, val]) => (
                  <div key={label} className="flex justify-between items-center">
                    <span className="text-gray-400 text-xs">{label}</span>
                    <span className="text-emerald-400 text-xs font-bold">{val}</span>
                  </div>
                ))}
              </div>
            </div>
            <p className="text-xs text-gray-500 mb-2">Your referral link</p>
            {referralCode ? (
              <div className="flex gap-2">
                <div className="flex-1 rounded-lg px-3 py-2 text-xs text-gray-300 truncate" style={{ background: "#0A0F1A", border: "1px solid #1E2D45" }}>
                  {getReferralLink()}
                </div>
                <button
                  onClick={copyLink}
                  className="shrink-0 px-4 py-2 rounded-lg text-xs font-bold transition-all"
                  style={{ background: copied ? "#22c55e20" : "#22c55e", color: copied ? "#22c55e" : "#000", border: copied ? "1px solid #22c55e40" : "none" }}
                >
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>
            ) : (
              <div className="text-xs text-gray-500 py-2">Loading your link...</div>
            )}
            <p className="text-xs text-gray-600 mt-3">Signup credits are added instantly. Purchase rewards are added after their first top-up.</p>

            {/* Leaderboard */}
            {leaderboard.length > 0 && (
              <div className="mt-4 rounded-xl overflow-hidden" style={{ background: "#0A0F1A", border: "1px solid #1E2D45" }}>
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest px-3 py-2" style={{ borderBottom: "1px solid #1E2D45" }}>Top Referrers</p>
                <div className="divide-y" style={{ borderColor: "#1E2D45" }}>
                  {leaderboard.map((u) => (
                    <div key={u.rank} className="flex items-center gap-2.5 px-3 py-2">
                      <span className="text-[10px] font-bold w-4 shrink-0 text-center" style={{ color: u.rank === 1 ? "#F5A623" : u.rank === 2 ? "#94A3B8" : u.rank === 3 ? "#CD7F32" : "#475569" }}>
                        #{u.rank}
                      </span>
                      {u.avatar_url ? (
                        <img src={u.avatar_url} alt={u.username} className="w-6 h-6 rounded-full shrink-0 object-cover" />
                      ) : (
                        <div className="w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-[10px] font-bold text-white" style={{ background: "#2B7EC9" }}>
                          {u.username.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <span className="text-xs font-bold text-emerald-400 ml-auto">+{u.credits} cr</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {referralStats && (
              <div className="mt-4">
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div className="rounded-lg px-3 py-2 text-center" style={{ background: "#0A0F1A", border: "1px solid #1E2D45" }}>
                    <p className="text-lg font-bold text-white">{referralStats.total}</p>
                    <p className="text-xs text-gray-500">Signups referred</p>
                  </div>
                  <div className="rounded-lg px-3 py-2 text-center" style={{ background: "#0A0F1A", border: "1px solid #1E2D45" }}>
                    <p className="text-lg font-bold text-emerald-400">+{referralStats.credits}</p>
                    <p className="text-xs text-gray-500">Credits earned</p>
                  </div>
                </div>
                {referralStats.history.length > 0 && (
                  <div className="rounded-xl overflow-hidden" style={{ background: "#0A0F1A", border: "1px solid #1E2D45" }}>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest px-3 py-2" style={{ borderBottom: "1px solid #1E2D45" }}>History</p>
                    <div className="divide-y max-h-36 overflow-y-auto" style={{ borderColor: "#1E2D45" }}>
                      {referralStats.history.map((h, i) => (
                        <div key={i} className="flex items-center justify-between px-3 py-2">
                          <div>
                            <p className="text-xs text-gray-300">{h.description}</p>
                            <p className="text-xs text-gray-600">{new Date(h.created_at).toLocaleDateString("en-PH", { month: "short", day: "numeric" })}</p>
                          </div>
                          <span className="text-xs font-bold text-emerald-400">+{h.amount}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
