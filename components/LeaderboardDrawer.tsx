"use client";

import { useEffect, useState } from "react";

const BADGE_COLORS: Record<string, string> = {
  "Hilas Dominator": "#D97706",
  "Ad Machine": "#8B5CF6",
  "Consistent Operator": "#1877F2",
  "Starter Launcher": "#10B981",
};

const RANK_MEDALS = ["🥇", "🥈", "🥉"];

interface Entry {
  rank: number;
  username: string;
  avatar_url: string | null;
  launches: number;
  badge: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function LeaderboardDrawer({ open, onClose }: Props) {
  const [period, setPeriod] = useState<"alltime" | "month">("alltime");
  const [data, setData] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    fetch(`/api/launch/leaderboard?period=${period}`)
      .then(r => r.json())
      .then(d => { setData((d.leaderboard || []).slice(0, 5)); setLoading(false); })
      .catch(() => setLoading(false));
  }, [open, period]);

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        style={{ background: "rgba(0,0,0,0.2)" }}
        onClick={onClose}
      />

      {/* Popup — drops down from Leaderboard button */}
      <div
        className="fixed z-50 rounded-2xl overflow-hidden shadow-2xl"
        style={{
          top: "56px",
          left: "calc(240px + 24px + 120px)",
          width: "320px",
          maxHeight: "calc(100vh - 80px)",
          background: "#FFFFFF",
          border: "1px solid #E4E6EB",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid #E4E6EB" }}>
          <div className="flex items-center gap-2">
            <span className="text-lg">🏆</span>
            <div>
              <p className="text-[#1c1e21] font-bold text-sm">Ads Launched</p>
              <p className="text-[#8a8d91] text-xs">Real operators. Verified campaigns.</p>
            </div>
          </div>
          <button onClick={onClose} className="text-[#8a8d91] hover:text-[#1c1e21] p-1 transition-colors">✕</button>
        </div>

        {/* Period toggle */}
        <div className="flex gap-2 px-5 py-3" style={{ borderBottom: "1px solid #E4E6EB" }}>
          {(["alltime", "month"] as const).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
              style={{
                background: period === p ? "#1877F2" : "#f2f3f5",
                color: period === p ? "#fff" : "#64748B",
                border: `1px solid ${period === p ? "#1877F2" : "#E4E6EB"}`,
              }}
            >
              {p === "alltime" ? "All Time" : "This Month"}
            </button>
          ))}
        </div>

        {/* List */}
        <div className="px-4 py-4 space-y-3 overflow-y-auto" style={{ maxHeight: "calc(100vh - 200px)" }}>
          {loading ? (
            <div className="flex gap-1.5 justify-center py-12">
              {[0, 1, 2].map(i => (
                <div key={i} className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />
              ))}
            </div>
          ) : data.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-3xl mb-3">🚀</p>
              <p className="text-[#1c1e21] font-semibold text-sm mb-1">No launches yet</p>
              <p className="text-[#8a8d91] text-xs">Be the first to submit your campaign proof.</p>
            </div>
          ) : (
            data.map((entry) => {
              const badgeColor = BADGE_COLORS[entry.badge] || "#64748B";
              const rankColor = entry.rank === 1 ? "#D97706" : entry.rank === 2 ? "#64748B" : entry.rank === 3 ? "#CD7F32" : "#64748B";
              const initial = entry.username.charAt(0).toUpperCase();

              return (
                <div
                  key={entry.rank}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl"
                  style={{
                    background: entry.rank <= 3 ? `${rankColor}08` : "#f2f3f5",
                    border: `1px solid ${entry.rank <= 3 ? rankColor + "25" : "#E4E6EB"}`,
                  }}
                >
                  {/* Medal / rank */}
                  <div className="w-7 h-7 flex items-center justify-center flex-shrink-0 text-base">
                    {entry.rank <= 3 ? RANK_MEDALS[entry.rank - 1] : <span className="text-xs font-bold" style={{ color: "#65676B" }}>#{entry.rank}</span>}
                  </div>

                  {/* Avatar */}
                  {entry.avatar_url ? (
                    <img
                      src={entry.avatar_url}
                      alt={entry.username}
                      className="w-9 h-9 rounded-full object-cover flex-shrink-0"
                      style={{ border: `2px solid ${entry.rank <= 3 ? rankColor + "50" : "#E4E6EB"}` }}
                    />
                  ) : (
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                      style={{
                        background: `${badgeColor}20`,
                        color: badgeColor,
                        border: `2px solid ${badgeColor}30`,
                      }}
                    >
                      {initial}
                    </div>
                  )}

                  {/* Name + badge */}
                  <div className="flex-1 min-w-0">
                    <p className="text-[#1c1e21] font-semibold text-sm truncate">{entry.username}</p>
                    {entry.badge && (
                      <span
                        className="text-xs font-bold px-1.5 py-0.5 rounded-full"
                        style={{ background: `${badgeColor}15`, color: badgeColor }}
                      >
                        {entry.badge}
                      </span>
                    )}
                  </div>

                  {/* Count */}
                  <div className="text-right flex-shrink-0">
                    <p className="text-[#1c1e21] font-black text-base">{entry.launches}</p>
                    <p className="text-[#8a8d91] text-xs">launched</p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </>
  );
}
