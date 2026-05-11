"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import LeaderboardDrawer from "@/components/LeaderboardDrawer";

const HIDDEN_PATHS = ["/home", "/loading-screen"];

export default function TopBar() {
  const pathname = usePathname();
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  if (HIDDEN_PATHS.includes(pathname) || pathname.startsWith("/admin") || pathname.startsWith("/blog")) return null;

  return (
    <>
      <div
        className="hidden md:flex items-center justify-between gap-2 px-6 py-3 fixed top-0 right-0 z-20"
        style={{ background: "#FFFFFF", borderBottom: "1px solid #E2E8F0", left: "240px" }}
      >
        {/* Left - Library */}
        <Link
          href="/library"
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all hover:brightness-110"
          style={pathname === "/library"
            ? { background: "rgba(43,126,201,0.2)", color: "#2B7EC9", border: "1px solid rgba(43,126,201,0.4)" }
            : { background: "#F1F5F9", color: "#64748B", border: "1px solid #E2E8F0" }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
          Media Library
        </Link>

        {/* Right - Blog + Leaderboard */}
        <div className="flex items-center gap-2">
          <Link
            href="/blog"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all hover:brightness-110"
            style={{ background: "#F1F5F9", color: "#64748B", border: "1px solid #E2E8F0" }}
          >
            Blog
          </Link>
          <button
            onClick={() => setShowLeaderboard(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all hover:brightness-110"
            style={{ background: "#F1F5F9", color: "#F5A623", border: "1px solid #F5A62330" }}
          >
            Leaderboard
          </button>
        </div>
      </div>

      <LeaderboardDrawer open={showLeaderboard} onClose={() => setShowLeaderboard(false)} />
    </>
  );
}
