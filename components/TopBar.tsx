"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import LeaderboardDrawer from "@/components/LeaderboardDrawer";

const HIDDEN_PATHS = ["/home", "/loading-screen"];
const PUBLIC_ROUTES = ["/pricing", "/blog", "/privacy", "/terms", "/data-deletion"];

export default function TopBar() {
  const pathname = usePathname();
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  if (HIDDEN_PATHS.includes(pathname) || pathname.startsWith("/admin") || pathname.startsWith("/blog")) return null;

  const isPublic = PUBLIC_ROUTES.some((r) => pathname === r || pathname.startsWith(r + "/")) || pathname.startsWith("/ref/");
  const leftOffset = isPublic ? "0px" : "240px";

  return (
    <>
      <div
        className="hidden md:flex items-center justify-between gap-2 px-6 py-3 fixed top-0 right-0 z-20"
        style={{ background: "#FFFFFF", borderBottom: "1px solid #E4E6EB", left: leftOffset }}
      >
        {/* Left - Library or Back to Dashboard */}
        {isPublic ? (
          <Link
            href="/"
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all hover:brightness-110"
            style={{ background: "#1877F2", color: "#fff", border: "1px solid #1877F2" }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
            Back to Dashboard
          </Link>
        ) : (
          <Link
            href="/library"
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all hover:brightness-110"
            style={pathname === "/library"
              ? { background: "rgba(24,119,242,0.2)", color: "#1877F2", border: "1px solid rgba(24,119,242,0.4)" }
              : { background: "#f2f3f5", color: "#65676B", border: "1px solid #E4E6EB" }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
            Media Library
          </Link>
        )}

        {/* Right - Blog + Leaderboard */}
        <div className="flex items-center gap-2">
          <Link
            href="/blog"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all hover:brightness-110"
            style={{ background: "#f2f3f5", color: "#65676B", border: "1px solid #E4E6EB" }}
          >
            Blog
          </Link>
          <button
            onClick={() => setShowLeaderboard(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all hover:brightness-110"
            style={{ background: "#f2f3f5", color: "#D97706", border: "1px solid #D9770630" }}
          >
            Leaderboard
          </button>
        </div>
      </div>

      <LeaderboardDrawer open={showLeaderboard} onClose={() => setShowLeaderboard(false)} />
    </>
  );
}
