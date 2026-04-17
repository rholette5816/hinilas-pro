"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";

const BADGE_COLORS: Record<string, string> = {
  "Hilas Dominator": "#F5A623",
  "Ad Machine": "#8B5CF6",
  "Consistent Operator": "#2B7EC9",
  "Starter Launcher": "#10B981",
};

const RANK_COLORS = ["#F5A623", "#94A3B8", "#CD7F32"];

interface Entry {
  rank: number;
  username: string;
  avatar_url: string | null;
  launches: number;
  badge: string;
}

export default function LeaderboardPage() {
  const [period, setPeriod] = useState<"alltime" | "month">("alltime");
  const [data, setData] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/launch/leaderboard?period=${period}`)
      .then(r => r.json())
      .then(d => { setData(d.leaderboard || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [period]);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto pt-14 md:pt-0">
        <div className="max-w-2xl mx-auto px-6 py-10">

          {/* Header */}
          <div className="mb-8">
            <div className="inline-flex items-center gap-2 bg-yellow-950 border border-yellow-800 rounded-full px-3 py-1 mb-4">
              <span className="text-yellow-300 text-xs font-medium">🏆 Leaderboard</span>
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Ads Launched</h1>
            <p className="text-gray-400 text-sm">Ranked by verified campaign launches. Real operators only.</p>
          </div>

          {/* Period toggle */}
          <div className="flex gap-2 mb-8">
            {(["alltime", "month"] as const).map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className="px-4 py-2 rounded-lg text-xs font-bold transition-all"
                style={{
                  background: period === p ? "#2B7EC9" : "#1E293B",
                  color: period === p ? "#fff" : "#64748B",
                  border: `1px solid ${period === p ? "#2B7EC9" : "#334155"}`,
                }}
              >
                {p === "alltime" ? "All Time" : "This Month"}
              </button>
            ))}
          </div>

          {/* Badges legend */}
          <div className="grid grid-cols-2 gap-2 mb-8">
            {Object.entries(BADGE_COLORS).map(([badge, color]) => (
              <div key={badge} className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: "#1E293B", border: `1px solid ${color}20` }}>
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
                <span className="text-xs font-medium" style={{ color }}>{badge}</span>
              </div>
            ))}
          </div>

          {/* Leaderboard */}
          {loading ? (
            <div className="flex gap-1.5 justify-center py-16">
              {[0, 1, 2].map(i => (
                <div key={i} className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />
              ))}
            </div>
          ) : data.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-4xl mb-4">🚀</p>
              <p className="text-white font-semibold mb-1">No launches yet</p>
              <p className="text-gray-500 text-sm">Be the first to submit your campaign proof.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {data.map((entry) => {
                const rankColor = RANK_COLORS[entry.rank - 1] || "#475569";
                const badgeColor = BADGE_COLORS[entry.badge] || "#64748B";
                const initial = entry.username.charAt(0).toUpperCase();

                return (
                  <div
                    key={entry.rank}
                    className="flex items-center gap-4 px-5 py-4 rounded-2xl"
                    style={{
                      background: entry.rank <= 3 ? `${rankColor}08` : "#1E293B",
                      border: `1px solid ${entry.rank <= 3 ? rankColor + "30" : "#334155"}`,
                    }}
                  >
                    {/* Rank */}
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-black flex-shrink-0"
                      style={{
                        background: entry.rank <= 3 ? `${rankColor}20` : "#0F172A",
                        color: rankColor,
                      }}
                    >
                      {entry.rank <= 3 ? ["🥇", "🥈", "🥉"][entry.rank - 1] : `#${entry.rank}`}
                    </div>

                    {/* Avatar */}
                    {entry.avatar_url ? (
                      <img src={entry.avatar_url} alt={entry.username} className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0" style={{ background: `${badgeColor}20`, color: badgeColor }}>
                        {initial}
                      </div>
                    )}

                    {/* Name + badge */}
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-semibold text-sm truncate">{entry.username}</p>
                      {entry.badge && (
                        <span
                          className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                          style={{ background: `${badgeColor}15`, color: badgeColor }}
                        >
                          {entry.badge}
                        </span>
                      )}
                    </div>

                    {/* Count */}
                    <div className="text-right flex-shrink-0">
                      <p className="text-white font-black text-lg">{entry.launches}</p>
                      <p className="text-gray-500 text-[10px]">ads launched</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
