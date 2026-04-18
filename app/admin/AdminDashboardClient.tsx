"use client";

import { useEffect, useState } from "react";

type ModuleStats = { prompt: number; completion: number; total: number; calls: number };
type AdminStats = {
  userStats: {
    totalSignups: number;
    newToday: number;
    new7d: number;
    new30d: number;
    thisWeekSignups: number;
    lastWeekSignups: number;
    returnUsers: number;
    usersAtZero: number;
    planBreakdown: { Lite: number; Flex: number; Max: number };
  };
  creditActivity: {
    totalCreditsIssued: number;
    totalCreditsConsumed: number;
    topupEventCount: number;
    topupCreditsIssued: number;
  };
  tokenStats: {
    byModule: Record<string, ModuleStats>;
    grandTotalTokens: number;
    estCostUSD: number;
  };
  departmentFunnel: Array<{ module: string; count: number; uniqueUsers: number }>;
  signupTrend: Array<{ day: string; label: string; count: number }>;
  topUsers: Array<{ userId: string; username: string; email: string; consumed: number; creditsRemaining: number; plan: string }>;
  videoUnlocks: { campaign: number; adset: number; ads: number; analyze_basic: number; analyze_advanced: number };
  users: Array<{ userId: string; username: string; email: string; plan: string; creditsRemaining: number; signupDate: string | null }>;
  recentActivity: Array<{ userId: string; username: string; type: string; amount: number; description: string; createdAt: string | null }>;
  fetchedAt: string;
};

type SortKey = "username" | "email" | "plan" | "creditsRemaining" | "signupDate";
type SortDirection = "asc" | "desc";

const DEPT_LABELS: Record<string, string> = {
  research: "Research Dept",
  angles: "Strategy Dept",
  creative: "Creative Dept",
  copy: "Caption Dept",
  analyze: "Audit Dept",
};
const DEPT_COLORS: Record<string, string> = {
  research: "#10B981",
  angles: "#F5A623",
  creative: "#EC4899",
  copy: "#8B5CF6",
  analyze: "#FBBF24",
};

function formatNumber(v: number) { return new Intl.NumberFormat("en-PH").format(v); }
function formatDate(v: string | null) {
  if (!v) return "N/A";
  return new Date(v).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" });
}
function timeAgo(v: string | null) {
  if (!v) return "N/A";
  const s = Math.floor((Date.now() - new Date(v).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}
function pct(a: number, b: number) {
  if (!b) return "—";
  return `${Math.round((a / b) * 100)}%`;
}
function wowLabel(curr: number, prev: number) {
  if (!prev) return curr > 0 ? "↑ new" : "—";
  const d = curr - prev;
  if (d === 0) return "same as last wk";
  return `${d > 0 ? "↑" : "↓"} ${Math.abs(d)} vs last wk`;
}

function KPICard({ label, value, sub, subColor }: { label: string; value: string; sub?: string; subColor?: string }) {
  return (
    <div className="rounded-2xl p-5" style={{ background: "#0F172A", border: "1px solid #1E2D45" }}>
      <p className="text-[10px] font-bold tracking-widest uppercase mb-2" style={{ color: "#64748B" }}>{label}</p>
      <p className="text-3xl font-black text-white">{value}</p>
      {sub && <p className="text-xs mt-2" style={{ color: subColor || "#64748B" }}>{sub}</p>}
    </div>
  );
}

function SectionHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-white font-bold text-base">{title}</h2>
      {sub && <p className="text-xs mt-0.5" style={{ color: "#64748B" }}>{sub}</p>}
    </div>
  );
}

function BarChart({ data, color = "#2B7EC9" }: { data: { label: string; value: number }[]; color?: string }) {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div className="flex items-end gap-1 h-28 w-full">
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1 min-w-0">
          <div className="w-full rounded-t-sm transition-all" style={{ height: `${Math.max((d.value / max) * 100, d.value > 0 ? 4 : 0)}%`, background: d.value > 0 ? color : "#1E293B", minHeight: d.value > 0 ? 3 : 1 }} />
          <span className="text-[8px] text-gray-600 truncate w-full text-center">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

function HorizontalBar({ label, value, max, color, sub }: { label: string; value: number; max: number; color: string; sub?: string }) {
  const pctWidth = max > 0 ? Math.max((value / max) * 100, value > 0 ? 2 : 0) : 0;
  return (
    <div className="mb-3">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium text-white">{label}</span>
        <div className="text-right">
          <span className="text-xs font-bold text-white">{formatNumber(value)}</span>
          {sub && <span className="text-[10px] ml-2" style={{ color: "#64748B" }}>{sub}</span>}
        </div>
      </div>
      <div className="w-full rounded-full h-2" style={{ background: "#1E293B" }}>
        <div className="h-2 rounded-full transition-all" style={{ width: `${pctWidth}%`, background: color }} />
      </div>
    </div>
  );
}

function CreditFlowChart({ issued, consumed }: { issued: number; consumed: number }) {
  const max = Math.max(issued, consumed, 1);
  const issuedH = Math.max((issued / max) * 140, issued > 0 ? 4 : 0);
  const consumedH = Math.max((consumed / max) * 140, consumed > 0 ? 4 : 0);
  return (
    <div className="flex items-end justify-center gap-10 h-40 mt-4">
      <div className="flex flex-col items-center gap-2">
        <span className="text-xs font-bold text-white">{formatNumber(issued)}</span>
        <div className="w-16 rounded-t-lg" style={{ height: issuedH, background: "#22C55E" }} />
        <span className="text-[10px] text-gray-500">Issued</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <span className="text-xs font-bold text-white">{formatNumber(consumed)}</span>
        <div className="w-16 rounded-t-lg" style={{ height: consumedH, background: "#EF4444" }} />
        <span className="text-[10px] text-gray-500">Consumed</span>
      </div>
    </div>
  );
}

export default function AdminDashboardClient() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("signupDate");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [activeTab, setActiveTab] = useState<"overview" | "users" | "departments" | "tokens">("overview");

  useEffect(() => {
    let mounted = true;
    async function loadStats() {
      try {
        const res = await fetch("/api/admin/stats", { cache: "no-store" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load admin stats");
        if (mounted) { setStats(data); setError(""); }
      } catch (err) {
        if (mounted) setError(err instanceof Error ? err.message : "Failed to load");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadStats();
    const interval = setInterval(loadStats, 30000);
    return () => { mounted = false; clearInterval(interval); };
  }, []);

  function handleSort(nextKey: SortKey) {
    if (sortKey === nextKey) { setSortDirection(p => p === "asc" ? "desc" : "asc"); return; }
    setSortKey(nextKey);
    setSortDirection(nextKey === "signupDate" || nextKey === "creditsRemaining" ? "desc" : "asc");
  }

  const sortedUsers = stats
    ? [...stats.users].sort((a, b) => {
        const dir = sortDirection === "asc" ? 1 : -1;
        if (sortKey === "creditsRemaining") return (a.creditsRemaining - b.creditsRemaining) * dir;
        if (sortKey === "signupDate") {
          const aT = a.signupDate ? new Date(a.signupDate).getTime() : 0;
          const bT = b.signupDate ? new Date(b.signupDate).getTime() : 0;
          return (aT - bT) * dir;
        }
        return a[sortKey].localeCompare(b[sortKey]) * dir;
      })
    : [];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#0B1120" }}>
        <p style={{ color: "#64748B" }}>Loading dashboard...</p>
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

  const { userStats, creditActivity, tokenStats, departmentFunnel, signupTrend, topUsers, recentActivity } = stats;
  const funnelMax = Math.max(...departmentFunnel.map(d => d.count), 1);
  const tokenMax = Math.max(...Object.values(tokenStats.byModule).map(m => m.total), 1);
  const wowColor = userStats.thisWeekSignups >= userStats.lastWeekSignups ? "#22C55E" : "#EF4444";

  const TABS = [
    { key: "overview", label: "Overview" },
    { key: "departments", label: "Departments" },
    { key: "tokens", label: "Token Usage" },
    { key: "users", label: "Users" },
  ] as const;

  return (
    <div className="min-h-screen px-4 md:px-6 py-8" style={{ background: "#0B1120", color: "#fff" }}>
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="mb-6 flex items-end justify-between gap-4 flex-wrap">
          <div>
            <p className="text-[10px] font-bold tracking-widest uppercase mb-1" style={{ color: "#2B7EC9" }}>Owner Dashboard</p>
            <h1 className="text-3xl font-black text-white">Command Center</h1>
            <p className="text-sm mt-1" style={{ color: "#64748B" }}>Decision metrics — refreshes every 30s</p>
          </div>
          <div className="rounded-xl px-4 py-3 text-right" style={{ background: "#0F172A", border: "1px solid #1E2D45" }}>
            <p className="text-[10px] font-bold tracking-widest uppercase" style={{ color: "#64748B" }}>Last Refresh</p>
            <p className="text-sm text-white mt-1">{timeAgo(stats.fetchedAt)}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className="px-4 py-2 rounded-xl text-xs font-bold transition-all"
              style={activeTab === tab.key
                ? { background: "#2B7EC9", color: "#fff" }
                : { background: "#0F172A", color: "#64748B", border: "1px solid #1E2D45" }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* OVERVIEW TAB */}
        {activeTab === "overview" && (
          <div className="space-y-6">

            {/* KPI row 1 — Growth */}
            <div>
              <SectionHeader title="Growth" sub="User acquisition and retention signals" />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <KPICard label="Total Users" value={formatNumber(userStats.totalSignups)} sub={`${userStats.newToday} today`} />
                <KPICard
                  label="This Week"
                  value={formatNumber(userStats.thisWeekSignups)}
                  sub={wowLabel(userStats.thisWeekSignups, userStats.lastWeekSignups)}
                  subColor={wowColor}
                />
                <KPICard
                  label="Return Users"
                  value={formatNumber(userStats.returnUsers)}
                  sub={`${pct(userStats.returnUsers, userStats.totalSignups)} of all users`}
                />
                <KPICard
                  label="Churn Risk"
                  value={formatNumber(userStats.usersAtZero)}
                  sub="users at 0 credits"
                  subColor={userStats.usersAtZero > 0 ? "#EF4444" : "#22C55E"}
                />
              </div>
            </div>

            {/* Signup trend chart */}
            <div className="rounded-2xl p-5" style={{ background: "#0F172A", border: "1px solid #1E2D45" }}>
              <SectionHeader title="Signup Trend — Last 14 Days" sub="New users per day" />
              <BarChart data={signupTrend.map(d => ({ label: d.label, value: d.count }))} color="#2B7EC9" />
            </div>

            {/* KPI row 2 — Credits */}
            <div>
              <SectionHeader title="Credits" sub="How credits flow through the system" />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <KPICard label="Total Issued" value={formatNumber(creditActivity.totalCreditsIssued)} />
                <KPICard label="Total Consumed" value={formatNumber(creditActivity.totalCreditsConsumed)} sub={`${pct(creditActivity.totalCreditsConsumed, creditActivity.totalCreditsIssued)} burn rate`} />
                <KPICard label="Top-up Events" value={formatNumber(creditActivity.topupEventCount)} sub="paid transactions" />
                <KPICard label="Top-up Credits" value={formatNumber(creditActivity.topupCreditsIssued)} sub="purchased credits" />
              </div>
            </div>

            {/* Credit flow + API cost */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-2xl p-5" style={{ background: "#0F172A", border: "1px solid #1E2D45" }}>
                <SectionHeader title="Credit Flow" sub="Issued vs consumed all time" />
                <CreditFlowChart issued={creditActivity.totalCreditsIssued} consumed={creditActivity.totalCreditsConsumed} />
              </div>
              <div className="rounded-2xl p-5" style={{ background: "#0F172A", border: "1px solid #1E2D45" }}>
                <SectionHeader title="API Cost Estimate" sub="Based on Gemini 2.5 Flash pricing" />
                <p className="text-4xl font-black text-white mt-4">${tokenStats.estCostUSD.toFixed(4)}</p>
                <p className="text-xs mt-2" style={{ color: "#64748B" }}>
                  {formatNumber(tokenStats.grandTotalTokens)} total tokens logged
                </p>
                <p className="text-xs mt-1" style={{ color: "#64748B" }}>
                  $0.15/1M input · $0.60/1M output (USD)
                </p>
                <div className="mt-4 pt-4" style={{ borderTop: "1px solid #1E2D45" }}>
                  <p className="text-[10px] font-bold tracking-widest uppercase mb-1" style={{ color: "#64748B" }}>Plan Breakdown</p>
                  <div className="flex gap-4 mt-2">
                    {Object.entries(userStats.planBreakdown).map(([plan, count]) => (
                      <div key={plan}>
                        <p className="text-white font-bold text-lg">{count}</p>
                        <p className="text-[10px]" style={{ color: "#64748B" }}>{plan}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Live Activity */}
            <div className="rounded-2xl overflow-hidden" style={{ background: "#0F172A", border: "1px solid #1E2D45" }}>
              <div className="px-5 py-4 border-b" style={{ borderColor: "#1E2D45" }}>
                <SectionHeader title="Live Activity" sub="Last 20 credit transactions — auto-refreshes every 30s" />
              </div>
              <div className="max-h-80 overflow-auto divide-y" style={{ divideColor: "#1E2D45" }}>
                {recentActivity.map((a, i) => (
                  <div key={`${a.userId}-${a.createdAt}-${i}`} className="px-5 py-3 flex items-center justify-between gap-3" style={{ borderTop: i === 0 ? "none" : "1px solid #1E2D45" }}>
                    <div>
                      <p className="text-white font-semibold text-sm">{a.username}</p>
                      <p className="text-xs mt-0.5" style={{ color: "#94A3B8" }}>{a.type} · {a.description || "—"}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold" style={{ color: a.amount >= 0 ? "#22C55E" : "#EF4444" }}>
                        {a.amount >= 0 ? "+" : ""}{a.amount}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: "#64748B" }}>{timeAgo(a.createdAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* DEPARTMENTS TAB */}
        {activeTab === "departments" && (
          <div className="space-y-6">
            <div className="rounded-2xl p-5" style={{ background: "#0F172A", border: "1px solid #1E2D45" }}>
              <SectionHeader title="Department Funnel" sub="How many times each department was used — where users drop off" />
              <div className="mt-2 space-y-1">
                {["research", "angles", "creative", "copy", "analyze"].map(mod => {
                  const d = departmentFunnel.find(f => f.module === mod);
                  const count = d?.count || 0;
                  const unique = d?.uniqueUsers || 0;
                  return (
                    <HorizontalBar
                      key={mod}
                      label={DEPT_LABELS[mod]}
                      value={count}
                      max={funnelMax}
                      color={DEPT_COLORS[mod]}
                      sub={`${unique} unique users`}
                    />
                  );
                })}
              </div>
              <div className="mt-6 pt-4" style={{ borderTop: "1px solid #1E2D45" }}>
                <p className="text-xs font-semibold mb-3" style={{ color: "#64748B" }}>WHAT THIS TELLS YOU</p>
                {(() => {
                  const research = departmentFunnel.find(f => f.module === "research")?.count || 0;
                  const angles = departmentFunnel.find(f => f.module === "angles")?.count || 0;
                  const creative = departmentFunnel.find(f => f.module === "creative")?.count || 0;
                  const copy = departmentFunnel.find(f => f.module === "copy")?.count || 0;
                  const analyze = departmentFunnel.find(f => f.module === "analyze")?.count || 0;
                  const drops = [];
                  if (research > 0 && angles < research * 0.6) drops.push(`Only ${pct(angles, research)} of Research users move to Strategy — consider a stronger prompt to proceed.`);
                  if (angles > 0 && creative < angles * 0.6) drops.push(`Only ${pct(creative, angles)} of Strategy users move to Creative — angle selection may be friction.`);
                  if (creative > 0 && copy < creative * 0.6) drops.push(`Only ${pct(copy, creative)} of Creative users move to Captions — add a clearer next step CTA.`);
                  if (analyze === 0) drops.push("No one has used Audit Dept yet — consider promoting it to active users.");
                  if (drops.length === 0) drops.push("Funnel looks healthy. Watch for any drop-offs as user volume grows.");
                  return drops.map((d, i) => (
                    <div key={i} className="flex gap-2 mb-2">
                      <span style={{ color: "#F5A623" }}>→</span>
                      <p className="text-sm" style={{ color: "#94A3B8" }}>{d}</p>
                    </div>
                  ));
                })()}
              </div>
            </div>

            {/* Top Power Users */}
            <div className="rounded-2xl overflow-hidden" style={{ background: "#0F172A", border: "1px solid #1E2D45" }}>
              <div className="px-5 py-4 border-b" style={{ borderColor: "#1E2D45" }}>
                <SectionHeader title="Top 10 Power Users" sub="Highest credit consumption — best candidates for testimonials and upsells" />
              </div>
              <div className="overflow-auto">
                <table className="w-full text-sm">
                  <thead style={{ background: "#111827" }}>
                    <tr>
                      {["#", "User", "Email", "Plan", "Credits Used", "Credits Left"].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-bold uppercase tracking-widest" style={{ color: "#64748B" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {topUsers.map((u, i) => (
                      <tr key={u.userId} style={{ borderTop: "1px solid #1E2D45" }}>
                        <td className="px-4 py-3 text-gray-500 text-xs font-bold">#{i + 1}</td>
                        <td className="px-4 py-3 text-white font-medium">{u.username}</td>
                        <td className="px-4 py-3" style={{ color: "#94A3B8" }}>{u.email || "N/A"}</td>
                        <td className="px-4 py-3">
                          <span className="text-xs font-bold px-2 py-1 rounded-full"
                            style={{
                              background: u.plan === "Max" ? "rgba(239,68,68,0.15)" : u.plan === "Flex" ? "rgba(245,166,35,0.15)" : "rgba(156,163,175,0.15)",
                              color: u.plan === "Max" ? "#EF4444" : u.plan === "Flex" ? "#F5A623" : "#9CA3AF",
                            }}>
                            {u.plan}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-bold" style={{ color: "#EF4444" }}>{formatNumber(u.consumed)}</td>
                        <td className="px-4 py-3 text-white">{formatNumber(u.creditsRemaining)}</td>
                      </tr>
                    ))}
                    {topUsers.length === 0 && (
                      <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-600 text-sm">No usage data yet.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TOKENS TAB */}
        {activeTab === "tokens" && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <KPICard label="Total Tokens Logged" value={formatNumber(tokenStats.grandTotalTokens)} sub="all departments combined" />
              <KPICard label="Est. API Cost" value={`$${tokenStats.estCostUSD.toFixed(4)}`} sub="Gemini 2.5 Flash (USD)" />
              <KPICard label="Avg Cost / Generation" value={
                (() => {
                  const totalCalls = Object.values(tokenStats.byModule).reduce((s, m) => s + m.calls, 0);
                  if (!totalCalls) return "$0.0000";
                  return `$${(tokenStats.estCostUSD / totalCalls).toFixed(5)}`;
                })()
              } sub="per AI call" />
            </div>

            <div className="rounded-2xl p-5" style={{ background: "#0F172A", border: "1px solid #1E2D45" }}>
              <SectionHeader title="Token Usage by Department" sub="Total tokens consumed per module" />
              <div className="mt-2 space-y-1">
                {["research", "angles", "copy", "analyze", "creative"].map(mod => {
                  const m = tokenStats.byModule[mod];
                  return (
                    <HorizontalBar
                      key={mod}
                      label={DEPT_LABELS[mod]}
                      value={m?.total || 0}
                      max={tokenMax}
                      color={DEPT_COLORS[mod]}
                      sub={`${m?.calls || 0} calls`}
                    />
                  );
                })}
              </div>
            </div>

            <div className="rounded-2xl p-5" style={{ background: "#0F172A", border: "1px solid #1E2D45" }}>
              <SectionHeader title="Token Breakdown per Department" />
              <div className="overflow-auto">
                <table className="w-full text-sm mt-2">
                  <thead>
                    <tr>
                      {["Department", "Calls", "Input Tokens", "Output Tokens", "Total Tokens", "Est. Cost (USD)"].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-bold uppercase tracking-widest" style={{ color: "#64748B" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {["research", "angles", "copy", "analyze", "creative"].map(mod => {
                      const m = tokenStats.byModule[mod] || { prompt: 0, completion: 0, total: 0, calls: 0 };
                      const cost = (m.prompt / 1_000_000) * 0.15 + (m.completion / 1_000_000) * 0.60;
                      return (
                        <tr key={mod} style={{ borderTop: "1px solid #1E2D45" }}>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full" style={{ background: DEPT_COLORS[mod] }} />
                              <span className="text-white font-medium">{DEPT_LABELS[mod]}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-white">{formatNumber(m.calls)}</td>
                          <td className="px-4 py-3" style={{ color: "#94A3B8" }}>{formatNumber(m.prompt)}</td>
                          <td className="px-4 py-3" style={{ color: "#94A3B8" }}>{formatNumber(m.completion)}</td>
                          <td className="px-4 py-3 text-white font-bold">{formatNumber(m.total)}</td>
                          <td className="px-4 py-3 font-bold" style={{ color: "#F5A623" }}>${cost.toFixed(5)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* USERS TAB */}
        {activeTab === "users" && (
          <div className="rounded-2xl overflow-hidden" style={{ background: "#0F172A", border: "1px solid #1E2D45" }}>
            <div className="px-5 py-4 border-b" style={{ borderColor: "#1E2D45" }}>
              <SectionHeader title="All Users" sub="Sortable user list" />
            </div>
            <div className="overflow-auto max-h-[700px]">
              <table className="w-full text-sm">
                <thead style={{ background: "#111827" }}>
                  <tr>
                    {[
                      { key: "username", label: "Username" },
                      { key: "email", label: "Email" },
                      { key: "plan", label: "Plan" },
                      { key: "creditsRemaining", label: "Credits" },
                      { key: "signupDate", label: "Joined" },
                    ].map(col => (
                      <th
                        key={col.key}
                        className="px-4 py-3 text-left text-xs font-bold uppercase tracking-widest cursor-pointer"
                        style={{ color: "#64748B" }}
                        onClick={() => handleSort(col.key as SortKey)}
                      >
                        {col.label}
                        {sortKey === col.key && <span style={{ color: "#2B7EC9" }}> {sortDirection === "asc" ? "↑" : "↓"}</span>}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sortedUsers.map(u => (
                    <tr key={u.userId} style={{ borderTop: "1px solid #1E2D45" }}>
                      <td className="px-4 py-3 text-white font-medium">{u.username}</td>
                      <td className="px-4 py-3" style={{ color: "#94A3B8" }}>{u.email || "N/A"}</td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-bold px-2 py-1 rounded-full"
                          style={{
                            background: u.plan === "Max" ? "rgba(239,68,68,0.15)" : u.plan === "Flex" ? "rgba(245,166,35,0.15)" : "rgba(156,163,175,0.15)",
                            color: u.plan === "Max" ? "#EF4444" : u.plan === "Flex" ? "#F5A623" : "#9CA3AF",
                          }}>
                          {u.plan}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-white">{formatNumber(u.creditsRemaining)}</td>
                      <td className="px-4 py-3" style={{ color: "#94A3B8" }}>{formatDate(u.signupDate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
