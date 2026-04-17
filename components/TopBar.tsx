"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import LeaderboardDrawer from "@/components/LeaderboardDrawer";

const HIDDEN_PATHS = ["/home", "/loading-screen"];

export default function TopBar() {
  const pathname = usePathname();
  const router = useRouter();
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  if (HIDDEN_PATHS.includes(pathname)) return null;

  return (
    <>
      <div
        className="hidden md:flex items-center justify-between px-6 py-3 fixed top-0 right-0 z-20"
        style={{ background: "#0F172A", borderBottom: "1px solid #1E2D45", left: "240px" }}
      >
        <button
          onClick={() => setShowLeaderboard(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all hover:brightness-110"
          style={{ background: "#1E293B", color: "#F5A623", border: "1px solid #F5A62330" }}
        >
          🏆 Leaderboard
        </button>

        <button
          onClick={() => router.push("/research")}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all hover:brightness-110"
          style={{
            background: "#2B7EC9",
            color: "#fff",
            animation: "launchGlow 2s ease-in-out infinite alternate",
          }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
          </svg>
          Launch AI
        </button>

        <style>{`
          @keyframes launchGlow {
            0% { box-shadow: 0 0 12px rgba(43,126,201,0.5), 0 0 24px rgba(43,126,201,0.2); }
            100% { box-shadow: 0 0 24px rgba(43,126,201,0.8), 0 0 48px rgba(43,126,201,0.4); }
          }
        `}</style>
      </div>

      <LeaderboardDrawer open={showLeaderboard} onClose={() => setShowLeaderboard(false)} />
    </>
  );
}
