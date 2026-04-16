"use client";

import { useEffect, useState } from "react";

type AdminStats = {
  userStats: {
    totalSignups: number;
    newToday: number;
    new7d: number;
    new30d: number;
    planBreakdown: {
      Lite: number;
      Flex: number;
      Max: number;
    };
  };
  creditActivity: {
    totalCreditsIssued: number;
    totalCreditsConsumed: number;
    topupEventCount: number;
    topupCreditsIssued: number;
  };
  videoUnlocks: {
    campaign: number;
    adset: number;
    ads: number;
    analyze_basic: number;
    analyze_advanced: number;
  };
  users: Array<{
    userId: string;
    username: string;
    email: string;
    plan: "Lite" | "Flex" | "Max";
    creditsRemaining: number;
    signupDate: string | null;
  }>;
  recentActivity: Array<{
    userId: string;
    username: string;
    type: string;
    amount: number;
    description: string;
    createdAt: string | null;
  }>;
  fetchedAt: string;
};

type SortKey = "username" | "email" | "plan" | "creditsRemaining" | "signupDate";
type SortDirection = "asc" | "desc";

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-PH").format(value);
}

function formatDate(value: string | null) {
  if (!value) return "N/A";
  return new Date(value).toLocaleDateString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function timeAgo(value: string | null) {
  if (!value) return "N/A";

  const seconds = Math.floor((Date.now() - new Date(value).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div
      className="rounded-2xl p-5"
      style={{ background: "#0F172A", border: "1px solid #1E2D45" }}
    >
      <p className="text-[10px] font-bold tracking-widest uppercase mb-2" style={{ color: "#64748B" }}>
        {label}
      </p>
      <p className="text-3xl font-black text-white">{value}</p>
      {sub && <p className="text-xs mt-2" style={{ color: "#64748B" }}>{sub}</p>}
    </div>
  );
}

export default function AdminDashboardClient() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("signupDate");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  useEffect(() => {
    let mounted = true;

    async function loadStats() {
      try {
        const res = await fetch("/api/admin/stats", { cache: "no-store" });
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Failed to load admin stats");
        }

        if (mounted) {
          setStats(data);
          setError("");
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : "Failed to load admin stats");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadStats();
    const interval = setInterval(loadStats, 30000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  function handleSort(nextKey: SortKey) {
    if (sortKey === nextKey) {
      setSortDirection(prev => prev === "asc" ? "desc" : "asc");
      return;
    }

    setSortKey(nextKey);
    setSortDirection(nextKey === "signupDate" || nextKey === "creditsRemaining" ? "desc" : "asc");
  }

  const sortedUsers = stats
    ? [...stats.users].sort((a, b) => {
        const direction = sortDirection === "asc" ? 1 : -1;

        if (sortKey === "creditsRemaining") {
          return (a.creditsRemaining - b.creditsRemaining) * direction;
        }

        if (sortKey === "signupDate") {
          const aTime = a.signupDate ? new Date(a.signupDate).getTime() : 0;
          const bTime = b.signupDate ? new Date(b.signupDate).getTime() : 0;
          return (aTime - bTime) * direction;
        }

        return a[sortKey].localeCompare(b[sortKey]) * direction;
      })
    : [];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#0B1120" }}>
        <p style={{ color: "#64748B" }}>Loading admin dashboard...</p>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6" style={{ background: "#0B1120" }}>
        <div className="rounded-2xl px-6 py-5 text-center" style={{ background: "#0F172A", border: "1px solid #1E2D45" }}>
          <p className="text-white font-semibold mb-2">Could not load admin dashboard</p>
          <p style={{ color: "#64748B" }}>{error || "Unknown error"}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-6 py-8" style={{ background: "#0B1120", color: "#fff" }}>
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex items-end justify-between gap-4 flex-wrap">
          <div>
            <p className="text-[10px] font-bold tracking-widest uppercase mb-2" style={{ color: "#2B7EC9" }}>
              Owner Dashboard
            </p>
            <h1 className="text-3xl font-black text-white">Admin Analytics</h1>
            <p className="text-sm mt-2" style={{ color: "#64748B" }}>
              Live snapshot of users, credits, unlocks, and activity.
            </p>
          </div>
          <div className="rounded-xl px-4 py-3" style={{ background: "#0F172A", border: "1px solid #1E2D45" }}>
            <p className="text-[10px] font-bold tracking-widest uppercase" style={{ color: "#64748B" }}>
              Last Refresh
            </p>
            <p className="text-sm text-white mt-1">{timeAgo(stats.fetchedAt)}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
          <StatCard label="Total Signups" value={formatNumber(stats.userStats.totalSignups)} />
          <StatCard label="New Today" value={formatNumber(stats.userStats.newToday)} />
          <StatCard label="Last 7 Days" value={formatNumber(stats.userStats.new7d)} />
          <StatCard label="Last 30 Days" value={formatNumber(stats.userStats.new30d)} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
          <StatCard label="Lite Users" value={formatNumber(stats.userStats.planBreakdown.Lite)} />
          <StatCard label="Flex Users" value={formatNumber(stats.userStats.planBreakdown.Flex)} />
          <StatCard label="Max Users" value={formatNumber(stats.userStats.planBreakdown.Max)} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
          <StatCard label="Credits Issued" value={formatNumber(stats.creditActivity.totalCreditsIssued)} />
          <StatCard label="Credits Consumed" value={formatNumber(stats.creditActivity.totalCreditsConsumed)} />
          <StatCard label="Top-up Events" value={formatNumber(stats.creditActivity.topupEventCount)} />
          <StatCard label="Top-up Credits" value={formatNumber(stats.creditActivity.topupCreditsIssued)} />
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <StatCard label="Campaign Unlocks" value={formatNumber(stats.videoUnlocks.campaign)} />
          <StatCard label="Ad Set Unlocks" value={formatNumber(stats.videoUnlocks.adset)} />
          <StatCard label="Ads Unlocks" value={formatNumber(stats.videoUnlocks.ads)} />
          <StatCard label="Analyze Basic Unlocks" value={formatNumber(stats.videoUnlocks.analyze_basic)} />
          <StatCard label="Analyze Advanced Unlocks" value={formatNumber(stats.videoUnlocks.analyze_advanced)} />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[1.6fr_1fr] gap-6">
          <div className="rounded-2xl overflow-hidden" style={{ background: "#0F172A", border: "1px solid #1E2D45" }}>
            <div className="px-5 py-4 border-b" style={{ borderColor: "#1E2D45" }}>
              <h2 className="text-white font-bold text-lg">Users</h2>
              <p className="text-xs mt-1" style={{ color: "#64748B" }}>
                Sortable and scrollable user list.
              </p>
            </div>
            <div className="overflow-auto max-h-[620px]">
              <table className="w-full text-sm">
                <thead style={{ background: "#111827" }}>
                  <tr>
                    {[
                      { key: "username", label: "Username" },
                      { key: "email", label: "Email" },
                      { key: "plan", label: "Plan" },
                      { key: "creditsRemaining", label: "Credits" },
                      { key: "signupDate", label: "Signup Date" },
                    ].map(column => (
                      <th
                        key={column.key}
                        className="px-4 py-3 text-left text-xs font-bold uppercase tracking-widest cursor-pointer"
                        style={{ color: "#64748B" }}
                        onClick={() => handleSort(column.key as SortKey)}
                      >
                        {column.label}
                        {sortKey === column.key && (
                          <span style={{ color: "#2B7EC9" }}> {sortDirection === "asc" ? "↑" : "↓"}</span>
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sortedUsers.map(user => (
                    <tr key={user.userId} style={{ borderTop: "1px solid #1E2D45" }}>
                      <td className="px-4 py-3 text-white font-medium">{user.username}</td>
                      <td className="px-4 py-3" style={{ color: "#94A3B8" }}>{user.email || "N/A"}</td>
                      <td className="px-4 py-3">
                        <span
                          className="text-xs font-bold px-2 py-1 rounded-full"
                          style={{
                            background: user.plan === "Max" ? "rgba(239,68,68,0.15)" : user.plan === "Flex" ? "rgba(245,166,35,0.15)" : "rgba(156,163,175,0.15)",
                            color: user.plan === "Max" ? "#EF4444" : user.plan === "Flex" ? "#F5A623" : "#9CA3AF",
                          }}
                        >
                          {user.plan}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-white">{formatNumber(user.creditsRemaining)}</td>
                      <td className="px-4 py-3" style={{ color: "#94A3B8" }}>{formatDate(user.signupDate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-2xl overflow-hidden" style={{ background: "#0F172A", border: "1px solid #1E2D45" }}>
            <div className="px-5 py-4 border-b" style={{ borderColor: "#1E2D45" }}>
              <h2 className="text-white font-bold text-lg">Live Activity</h2>
              <p className="text-xs mt-1" style={{ color: "#64748B" }}>
                Last 20 credit transactions. Auto-refreshes every 30 seconds.
              </p>
            </div>
            <div className="max-h-[620px] overflow-auto">
              {stats.recentActivity.map((activity, index) => (
                <div
                  key={`${activity.userId}-${activity.createdAt}-${index}`}
                  className="px-5 py-4"
                  style={{ borderTop: index === 0 ? "none" : "1px solid #1E2D45" }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-white font-semibold text-sm">{activity.username}</p>
                      <p className="text-xs mt-1" style={{ color: "#94A3B8" }}>
                        {activity.type} • {activity.description || "No description"}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p
                        className="text-sm font-bold"
                        style={{ color: activity.amount >= 0 ? "#22C55E" : "#EF4444" }}
                      >
                        {activity.amount >= 0 ? "+" : ""}{activity.amount}
                      </p>
                      <p className="text-xs mt-1" style={{ color: "#64748B" }}>
                        {timeAgo(activity.createdAt)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
