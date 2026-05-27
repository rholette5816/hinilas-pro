"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import { useApp } from "@/lib/context";
import { HinilasIcon } from "@/components/HinilasLogo";
import FloatingExpert from "@/components/FloatingExpert";
import FloatingFeedback from "@/components/FloatingFeedback";
import LeaderboardDrawer from "@/components/LeaderboardDrawer";
import { OWNER_EMAILS } from "@/lib/admin";
import { createClient } from "@/lib/supabase/client";
import Image from "next/image";

const NAV_ITEMS = [
  {
    href: "/", label: "Setup", desc: "Business profile",
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/></svg>,
  },
  {
    href: "/research", label: "Research Department", desc: "Understand your market",
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>,
  },
  {
    href: "/angles", label: "Strategy Department", desc: "Find winning angles",
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
  },
  {
    href: "/creative", label: "Creative Department", desc: "Generate ad images",
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>,
  },
  {
    href: "/copy", label: "Caption Department", desc: "Write your captions",
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>,
  },
  {
    href: "/campaign-setup", label: "Campaign Setup", desc: "Build your campaign",
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 2L11 13"/><path d="M22 2 15 22 11 13 2 9l20-7z"/></svg>,
  },
  {
    href: "/analyze", label: "Audit Department", desc: "Read your results",
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
  },
  {
    href: "/content", label: "Content Creation", desc: "7 posts from your research",
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="3"/></svg>,
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { credits, creditsTotal, plan, setup, researchOutput, contentOutput, anglesOutput, copyOutput, savedImages } = useApp();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [expertOpen, setExpertOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [creditTooltipOpen, setCreditTooltipOpen] = useState(false);
  const [user, setUser] = useState<{ name: string; avatar: string } | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUser({
          name: user.user_metadata?.full_name || user.email || "User",
          avatar: user.user_metadata?.avatar_url || "",
        });
        if (user.email && OWNER_EMAILS.includes(user.email.toLowerCase().trim())) {
          setIsOwner(true);
        }
      }
    });
  }, []);

  // Auto-open feedback after the user's 3rd paid generation, once per user.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/feedback-trigger-check")
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (cancelled || !data?.shouldShow) return;
        // Brief delay so the user sees their result first, then the modal appears.
        setTimeout(() => { if (!cancelled) setFeedbackOpen(true); }, 1500);
      })
      .catch(() => {
        // Silent failure - never block the UI on this check.
      });
    return () => { cancelled = true; };
  // Run once on mount only
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/home");
    router.refresh();
  }

  const creditPct = Math.min((credits / Math.max(creditsTotal, 1)) * 100, 100);
  const planColor = plan === "max" ? "#EF4444" : plan === "flex" ? "#D97706" : "#9CA3AF";
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const planLabel = plan === "max" ? "Max Plan" : plan === "flex" ? "Flex Plan" : "Lite Plan";
  const planSuffix = plan === "max" ? "Max" : plan === "flex" ? "Flex" : "Lite";

  // Completion signals per nav item
  const completionMap: Record<string, boolean> = {
    "/": !!(setup?.businessName),
    "/research": !!(researchOutput),
    "/content": !!(contentOutput?.posts?.length),
    "/angles": !!(anglesOutput),
    "/creative": !!(savedImages?.main),
    "/copy": !!(copyOutput),
  };

  // Lock map — each route requires the previous step to be done
  const lockMap: Record<string, { locked: boolean; message: string }> = {
    "/research": { locked: !setup?.businessName, message: "Complete your Setup first." },
    "/content":  { locked: !researchOutput,       message: "Run Research first." },
    "/angles":   { locked: !researchOutput,       message: "Run Research first." },
    "/creative": { locked: !anglesOutput,          message: "Generate Angles first." },
    "/copy":     { locked: !savedImages?.main,     message: "Generate a Creative first." },
    "/campaign-setup": { locked: false, message: "" },
    "/affiliate": { locked: false, message: "" },
    "/analyze":  { locked: false, message: "" },
  };

  const [lockToast, setLockToast] = useState<string | null>(null);
  const showLockToast = useCallback((msg: string) => {
    setLockToast(msg);
    setTimeout(() => setLockToast(null), 2500);
  }, []);

  const SidebarContent = () => (
    <div className="flex flex-col h-full overflow-hidden">

      {/* Logo */}
      <div className="px-5 py-4 shrink-0 pr-10" style={{ borderBottom: "1px solid #E4E6EB" }}>
        <div className="flex items-center gap-3">
          <HinilasIcon size="md" accentColor={planColor} />
          <div>
            <div className="flex items-baseline gap-0">
              <span className="font-bold text-base" style={{ color: "#1C1E21" }}>Hinilas</span>
              <span className="font-bold text-base" style={{ color: planColor }}>{planSuffix}</span>
            </div>
            <p className="text-sm font-semibold" style={{ color: "#1877F2" }}>Marketing intelligence</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href;
          const done = completionMap[item.href] ?? false;
          const lock = lockMap[item.href];
          const isLocked = lock?.locked ?? false;
          const showTierLock = item.href === "/content" && plan === "lite";
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
                ? { background: "#e7f3ff", borderLeft: "2px solid #1877F2", paddingLeft: "10px" }
                : isLocked
                ? { borderLeft: "2px solid transparent", opacity: 0.45, cursor: "not-allowed" }
                : { borderLeft: "2px solid transparent" }
              }
            >
              <span style={{ color: active ? "#1877F2" : "#65676b" }} className="shrink-0 transition-colors">
                {item.icon}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-base font-medium flex items-center gap-1.5" style={{ color: active ? "#1877F2" : "#1c1e21" }}>
                  <span className="truncate">{item.label}</span>
                  {showTierLock && (
                    <span className="shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: "#E7F3FF", color: "#1877F2", border: "1px solid #BFDBFE" }}>
                      Flex+
                    </span>
                  )}
                </p>
                <p className="text-sm truncate" style={{ color: "#65676B" }}>{item.desc}</p>
              </div>
              {isLocked ? (
                <div className="shrink-0">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2.5"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                </div>
              ) : done && !active ? (
                <div className="shrink-0 w-4 h-4 rounded-full flex items-center justify-center" style={{ background: "#DCFCE7" }}>
                  <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                </div>
              ) : null}
            </Link>
          );
        })}

        {/* Divider */}
        <div className="my-2" style={{ borderTop: "1px solid #E4E6EB" }} />

        {/* Partner Program */}
        <Link
          href="/affiliate"
          onClick={() => setMobileOpen(false)}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all"
          style={pathname === "/affiliate" || pathname.startsWith("/affiliate/")
            ? { background: "#e7f3ff", borderLeft: "2px solid #1877F2", paddingLeft: "10px" }
            : { borderLeft: "2px solid transparent" }
          }
        >
          <span style={{ color: pathname === "/affiliate" || pathname.startsWith("/affiliate/") ? "#1877F2" : "#65676B" }} className="shrink-0">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2"/><path d="M6 12h.01M18 12h.01"/></svg>
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-base font-medium" style={{ color: pathname === "/affiliate" || pathname.startsWith("/affiliate/") ? "#1877F2" : "#1c1e21" }}>Partner Program</p>
            <p className="text-sm" style={{ color: "#65676B" }}>Earn cash per referral</p>
          </div>
        </Link>

        {/* Feedback button */}
        <button
          onClick={() => setFeedbackOpen(true)}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all group"
          style={{ borderLeft: "2px solid transparent" }}
        >
          <span style={{ color: "#65676B" }} className="shrink-0 transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          </span>
          <div className="min-w-0 flex-1 text-left">
            <p className="text-base font-medium" style={{ color: "#1C1E21" }}>Feedback</p>
            <p className="text-sm" style={{ color: "#65676B" }}>Share thoughts</p>
          </div>
          <span className="shrink-0 text-sm font-bold px-1.5 py-0.5 rounded-full" style={{ background: "rgba(34,197,94,0.15)", color: "#16a34a", border: "1px solid rgba(34,197,94,0.3)" }}>+2-65 cr</span>
        </button>
      </nav>

      {/* Footer */}
      <div className="px-3 pb-3 pt-2 shrink-0 space-y-2" style={{ borderTop: "1px solid #E4E6EB" }}>

        {/* Usage bar */}
        <div className="relative">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1">
              <span className="text-xs font-semibold" style={{ color: "#65676B" }}>Credits</span>
              <button
                type="button"
                onClick={() => setCreditTooltipOpen(open => !open)}
                aria-label="Show credit costs"
                className="w-3.5 h-3.5 rounded-full text-xs font-bold leading-none flex items-center justify-center"
                style={{ color: "#65676B", border: "1px solid #CBD5E1", background: "#FFFFFF" }}
              >?</button>
            </div>
            <span className="text-xs font-bold" style={{ color: planColor }}>{credits} / {creditsTotal}</span>
          </div>
          {creditTooltipOpen && (
            <div className="absolute bottom-full left-0 mb-2 w-40 rounded-lg px-3 py-2 text-xs shadow-lg z-20" style={{ background: "#FFFFFF", border: "1px solid #E4E6EB", color: "#1C1E21" }}>
              <div className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-1">
                <span>Research</span><span>1 cr</span>
                <span>Strategy</span><span>1 cr</span>
                <span>Caption</span><span>1 cr</span>
                <span>Image</span><span>2 cr</span>
                <span>Audit</span><span>1-2 cr</span>
              </div>
            </div>
          )}
          <div className="w-full rounded-full h-1" style={{ background: "#E4E6EB" }}>
            <div className="h-1 rounded-full transition-all" style={{ width: `${creditPct}%`, background: planColor }} />
          </div>
        </div>

        {/* Top up */}
        <button
          onClick={() => { setMobileOpen(false); router.push("/pricing"); }}
          className="w-full text-center text-xs font-bold py-1.5 rounded-lg transition-all hover:brightness-110"
          style={{ background: planColor, color: "#000" }}
        >Top Up</button>

        {/* User row + actions */}
        {user && (
          <div className="rounded-lg px-2 py-2" style={{ background: "#f2f3f5", border: "1px solid #E4E6EB" }}>
            <div className="flex items-center gap-2 mb-1.5">
              {user.avatar ? (
                <Image src={user.avatar} alt={user.name} width={28} height={28} className="rounded-full shrink-0" />
              ) : (
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0" style={{ background: "#1877F2" }}>
                  {user.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold truncate" style={{ color: "#1c1e21" }}>{user.name.split(" ")[0]}</p>
                <span className="text-xs font-bold px-1 py-0.5 rounded-full" style={{ background: `${planColor}20`, color: planColor }}>
                  {plan === "max" ? "Max" : plan === "flex" ? "Flex" : "Lite"}
                </span>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold transition-all hover:opacity-90 shrink-0"
                style={{ background: "#FFFFFF", color: "#65676B", border: "1px solid #E4E6EB" }}
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                Out
              </button>
            </div>
            {isOwner && (
              <div className="flex gap-2">
                <button
                  onClick={() => { setMobileOpen(false); router.push("/admin"); }}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1 rounded-lg text-xs font-semibold transition-all hover:opacity-90"
                  style={{ background: "rgba(24,119,242,0.12)", color: "#1877F2", border: "1px solid rgba(24,119,242,0.25)" }}
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
                  Admin Dashboard
                </button>
                <button
                  onClick={() => { setMobileOpen(false); router.push("/pitch"); }}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1 rounded-lg text-xs font-semibold transition-all hover:opacity-90"
                  style={{ background: "rgba(217,119,6,0.12)", color: "#D97706", border: "1px solid rgba(217,119,6,0.25)" }}
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
                  Investor Deck
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 px-4 py-3 flex items-center justify-between" style={{ background: "#FFFFFF", borderBottom: "1px solid #E4E6EB" }}>
        <div className="flex items-center gap-2">
          <HinilasIcon size="sm" accentColor="#D97706" />
          <span className="text-[#1c1e21] font-bold text-sm">Hinilas<span style={{ color: planColor }}>{planSuffix}</span></span>
        </div>
        <div className="flex items-center gap-1.5">
          <a
            href="/library"
            className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-sm font-bold transition-all hover:brightness-110"
            style={{ background: "#f2f3f5", color: "#1877F2", border: "1px solid #1877F230" }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
          </a>
          <button
            onClick={() => setShowLeaderboard(true)}
            className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-sm font-bold transition-all hover:brightness-110"
            style={{ background: "#f2f3f5", color: "#D97706", border: "1px solid #D9770630" }}
          >
            🏆 <span className="hidden xs:inline">Board</span>
          </button>
          <Link
            href="/blog"
            className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-sm font-bold transition-all hover:brightness-110"
            style={{ background: "#f2f3f5", color: "#65676B", border: "1px solid #E4E6EB" }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
            Blog
          </Link>
          <button onClick={() => setMobileOpen(true)} className="text-[#8a8d91] hover:text-[#1c1e21] p-1">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
          </button>
        </div>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-black/60" onClick={() => setMobileOpen(false)} />
      )}

      {/* Mobile drawer */}
      <aside
        className={`md:hidden fixed top-0 left-0 z-50 h-full w-72 transform transition-transform duration-300 ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}
        style={{ background: "rgba(248,250,252,0.92)", backdropFilter: "blur(12px)", borderRight: "1px solid #E4E6EB" }}
      >
        {/* Close button — absolute positioned so nav fills full height */}
        <button
          onClick={() => setMobileOpen(false)}
          className="absolute top-3 right-4 z-10 text-gray-500 hover:text-[#1c1e21] p-1"
        >✕</button>
        <div className="h-full">
          {/* eslint-disable-next-line react-hooks/static-components */}
          <SidebarContent />
        </div>
      </aside>

      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-60 flex-col h-full shrink-0" style={{ background: "rgba(248,250,252,0.85)", backdropFilter: "blur(12px)", borderRight: "1px solid #E4E6EB" }}>
        {/* eslint-disable-next-line react-hooks/static-components */}
        <SidebarContent />
      </aside>

      <FloatingExpert isOpen={expertOpen} onClose={() => setExpertOpen(false)} />
      <FloatingFeedback isOpen={feedbackOpen} onClose={() => setFeedbackOpen(false)} />
      <LeaderboardDrawer open={showLeaderboard} onClose={() => setShowLeaderboard(false)} />

      {/* Lock toast */}
      {lockToast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[100] px-4 py-2.5 rounded-xl text-sm font-semibold text-[#1c1e21] shadow-lg pointer-events-none"
          style={{ background: "#f2f3f5", border: "1px solid #64748B", whiteSpace: "nowrap" }}>
          🔒 {lockToast}
        </div>
      )}

    </>
  );
}
