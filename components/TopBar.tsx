"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import LeaderboardDrawer from "@/components/LeaderboardDrawer";

const HIDDEN_PATHS = ["/home", "/loading-screen"];

export default function TopBar() {
  const pathname = usePathname();
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  if (HIDDEN_PATHS.includes(pathname)) return null;

  return (
    <>
      <div
        className="hidden md:flex items-center justify-end px-6 py-3 fixed top-0 right-0 z-20"
        style={{ background: "#0F172A", borderBottom: "1px solid #1E2D45", left: "240px" }}
      >
        <button
          onClick={() => setShowLeaderboard(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all hover:brightness-110"
          style={{ background: "#1E293B", color: "#F5A623", border: "1px solid #F5A62330" }}
        >
          🏆 Leaderboard
        </button>
      </div>

      <LeaderboardDrawer open={showLeaderboard} onClose={() => setShowLeaderboard(false)} />
    </>
  );
}
