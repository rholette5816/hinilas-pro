"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

type ModuleStats = { prompt: number; completion: number; total: number; calls: number };
type AlertLevel = "good" | "info" | "warning" | "critical";

type TimeWindowStats = {
  signups: number;
  activeUsers: number;
  creditsIssued: number;
  creditsConsumed: number;
  topupsApproved: number;
  revenuePhp: number;
  feedbacks: number;
  launchesSubmitted: number;
  tokenCalls: number;
  emailsSent: number;
};

type ActivationStep = {
  key: string;
  label: string;
  count: number;
  rateFromPrevious: number | null;
  rateFromSignup: number | null;
};

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
    activeUsers: number;
    noUsageUsers: number;
    returnRate: number;
    planBreakdown: { Lite: number; Flex: number; Max: number };
  };
  creditActivity: {
    totalCreditsIssued: number;
    totalCreditsConsumed: number;
    topupEventCount: number;
    topupCreditsIssued: number;
    grantBreakdown: { signup: number; feedback: number; referral: number; campaignLaunch: number; topup: number; other: number };
    usageBreakdown: {
      research: number;
      angles: number;
      copy: number;
      creative: number;
      analyzeBasic: number;
      analyzeAdvanced: number;
      videoUnlocks: number;
      videoGeneration: number;
      consultation: number;
      other: number;
    };
  };
  tokenStats: {
    byModule: Record<string, ModuleStats>;
    grandTotalTokens: number;
    estCostUSD: number;
  };
  departmentFunnel: Array<{ module: string; count: number; uniqueUsers: number }>;
  activationFunnel: ActivationStep[];
  signupTrend: Array<{ day: string; label: string; count: number }>;
  topUsers: Array<{ userId: string; username: string; email: string; consumed: number; creditsRemaining: number; plan: string }>;
  videoUnlocks: { campaign: number; adset: number; ads: number; analyze_basic: number; analyze_advanced: number; generatedClips: number };
  revenue: {
    approvedRevenuePhp: number;
    pendingRevenuePhp: number;
    approvedTopupCount: number;
    pendingTopupCount: number;
    rejectedTopupCount: number;
    approvalRate: number;
    avgOrderValuePhp: number;
    approvedTopupCredits: number;
    paidUsers: number;
    freeToPaidRate: number;
    topPackage: string;
  };
  feedback: {
    total: number;
    averageRating: number;
    highRatingCount: number;
    lowRatingCount: number;
    testimonialCandidates: number;
    promptShownCount: number;
    promptToFeedbackRate: number | null;
    rewardCreditsIssued: number;
  };
  timeWindows: Record<"today" | "sevenDays" | "thirtyDays" | "allTime", TimeWindowStats>;
  alerts: Array<{ level: AlertLevel; title: string; message: string; action: string }>;
  recommendedActions: string[];
  healthScore: number;
  users: Array<{ userId: string; username: string; email: string; plan: string; creditsRemaining: number; signupDate: string | null }>;
  recentActivity: Array<{ userId: string; username: string; type: string; amount: number; description: string; createdAt: string | null; module?: string }>;
  dataQuality: {
    warnings: string[];
    optionalSourcesAvailable: Record<string, boolean>;
  };
  fetchedAt: string;
};

type SortKey = "username" | "email" | "plan" | "creditsRemaining" | "signupDate";
type SortDirection = "asc" | "desc";
type TabKey = "overview" | "funnel" | "revenue" | "feedback" | "tokens" | "users";
type ReportPayload = {
  generatedAt: string;
  summary: { healthScore: number; criticalAlerts: number; warningAlerts: number; weakestFunnelStep: string | null };
  wins: string[];
  risks: string[];
  actions: string[];
  markdown: string;
};

const DEPT_LABELS: Record<string, string> = {
  research: "Research",
  angles: "Angles",
  creative: "Creative",
  copy: "Copy",
  analyze: "Audit",
  video: "Video",
  consultation: "Consultation",
};

const DEPT_COLORS: Record<string, string> = {
  research: "#10B981",
  angles: "#F5A623",
  creative: "#EC4899",
  copy: "#8B5CF6",
  analyze: "#FBBF24",
  video: "#38BDF8",
  consultation: "#22C55E",
};

const ALERT_STYLES: Record<AlertLevel, { bg: string; border: string; color: string; label: string }> = {
  good: { bg: "rgba(34,197,94,0.10)", border: "rgba(34,197,94,0.30)", color: "#22C55E", label: "Good" },
  info: { bg: "rgba(56,189,248,0.10)", border: "rgba(56,189,248,0.30)", color: "#38BDF8", label: "Info" },
  warning: { bg: "rgba(245,166,35,0.12)", border: "rgba(245,166,35,0.35)", color: "#F5A623", label: "Watch" },
  critical: { bg: "rgba(239,68,68,0.12)", border: "rgba(239,68,68,0.35)", color: "#EF4444", label: "Urgent" },
};

function formatNumber(v: number | null | undefined) {
  return new Intl.NumberFormat("en-PH").format(v ?? 0);
}

function formatPhp(v: number | null | undefined) {
  return `PHP ${Math.round(v ?? 0).toLocaleString("en-PH")}`;
}

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
  if (!b) return "0%";
  return `${Math.round((a / b) * 100)}%`;
}

function wowLabel(curr: number, prev: number) {
  if (!prev) return curr > 0 ? "new this week" : "no movement";
  const d = curr - prev;
  if (d === 0) return "same as last week";
  return `${d > 0 ? "+" : "-"}${Math.abs(d)} vs last week`;
}

function scoreColor(score: number) {
  if (score >= 75) return "#22C55E";
  if (score >= 50) return "#F5A623";
  return "#EF4444";
}

function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl ${className}`} style={{ background: "#0F172A", border: "1px solid #1E2D45" }}>
      {children}
    </div>
  );
}

function KPICard({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: string }) {
  return (
    <Card className="p-4">
      <p className="text-[10px] font-bold tracking-widest uppercase mb-2" style={{ color: "#64748B" }}>{label}</p>
      <p className="text-2xl md:text-3xl font-black text-white leading-tight">{value}</p>
      {sub && <p className="text-xs mt-2" style={{ color: tone || "#64748B" }}>{sub}</p>}
    </Card>
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
        <div key={`${d.label}-${i}`} className="flex-1 flex flex-col items-center gap-1 min-w-0">
          <div
            className="w-full rounded-t-sm transition-all"
            style={{ height: `${Math.max((d.value / max) * 100, d.value > 0 ? 4 : 0)}%`, background: d.value > 0 ? color : "#1E293B", minHeight: d.value > 0 ? 3 : 1 }}
          />
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
      <div className="flex items-center justify-between mb-1 gap-3">
        <span className="text-xs font-medium text-white truncate">{label}</span>
        <div className="text-right shrink-0">
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

function AlertCard({ alert }: { alert: AdminStats["alerts"][number] }) {
  const style = ALERT_STYLES[alert.level];
  return (
    <div className="rounded-xl p-4" style={{ background: style.bg, border: `1px solid ${style.border}` }}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: style.color }}>{style.label}</p>
          <p className="text-white text-sm font-bold">{alert.title}</p>
        </div>
      </div>
      <p className="text-xs mt-2 leading-relaxed" style={{ color: "#CBD5E1" }}>{alert.message}</p>
      <p className="text-xs mt-3 font-semibold" style={{ color: style.color }}>{alert.action}</p>
    </div>
  );
}

function FunnelTable({ steps }: { steps: ActivationStep[] }) {
  const max = Math.max(...steps.map(s => s.count), 1);
  return (
    <Card className="p-5">
      <SectionHeader title="Activation Funnel" sub="From signup to paid user and launch proof" />
      <div className="space-y-3">
        {steps.map(step => (
          <div key={step.key}>
            <div className="flex items-center justify-between gap-3 mb-1">
              <div>
                <p className="text-sm font-semibold text-white">{step.label}</p>
                <p className="text-[10px]" style={{ color: "#64748B" }}>
                  {step.rateFromPrevious === null ? "baseline" : `${step.rateFromPrevious}% from previous`} - {step.rateFromSignup ?? 0}% of signups
                </p>
              </div>
              <p className="text-sm font-black text-white">{formatNumber(step.count)}</p>
            </div>
            <div className="h-2 rounded-full" style={{ background: "#1E293B" }}>
              <div className="h-2 rounded-full" style={{ width: `${Math.max((step.count / max) * 100, step.count > 0 ? 3 : 0)}%`, background: step.key === "paid" ? "#22C55E" : "#2B7EC9" }} />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function ReportPanel({ report, onCopy, copyLabel }: { report: ReportPayload; onCopy: () => void; copyLabel: string }) {
  return (
    <Card className="overflow-hidden">
      <div className="px-5 py-4 border-b flex items-center justify-between gap-3 flex-wrap" style={{ borderColor: "#1E2D45" }}>
        <div>
          <p className="text-[10px] font-bold tracking-widest uppercase" style={{ color: "#F5A623" }}>Generated Report</p>
          <h2 className="text-white font-black text-lg">Report & Analysis</h2>
          <p className="text-xs mt-1" style={{ color: "#64748B" }}>{report.generatedAt}</p>
        </div>
        <button
          onClick={onCopy}
          className="px-4 py-2 rounded-xl text-xs font-bold transition-all hover:brightness-110"
          style={{ background: "#1E293B", color: "#E2E8F0", border: "1px solid #334155" }}
        >
          {copyLabel}
        </button>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr]">
        <div className="p-5 space-y-4" style={{ borderRight: "1px solid #1E2D45" }}>
          <KPICard label="Health Score" value={`${report.summary.healthScore}/100`} tone={scoreColor(report.summary.healthScore)} />
          <KPICard label="Critical Alerts" value={formatNumber(report.summary.criticalAlerts)} tone={report.summary.criticalAlerts ? "#EF4444" : "#22C55E"} />
          <KPICard label="Watch Alerts" value={formatNumber(report.summary.warningAlerts)} tone={report.summary.warningAlerts ? "#F5A623" : "#22C55E"} />
          {report.summary.weakestFunnelStep && (
            <div className="rounded-xl p-4" style={{ background: "#111827", border: "1px solid #1E2D45" }}>
              <p className="text-[10px] uppercase font-bold tracking-widest" style={{ color: "#64748B" }}>Weakest Funnel Step</p>
              <p className="text-white font-bold mt-1">{report.summary.weakestFunnelStep}</p>
            </div>
          )}
        </div>
        <pre className="p-5 text-xs leading-relaxed whitespace-pre-wrap overflow-auto max-h-[680px]" style={{ color: "#CBD5E1" }}>
          {report.markdown}
        </pre>
      </div>
    </Card>
  );
}

export default function AdminDashboardClient() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("signupDate");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [resetting, setResetting] = useState(false);
  const [resetMsg, setResetMsg] = useState("");
  const [report, setReport] = useState<ReportPayload | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState("");
  const [copyLabel, setCopyLabel] = useState("Copy Report");

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

  async function handleResetTopups() {
    if (!confirm("This will delete ALL topup transactions and reverse those credits. Continue?")) return;
    setResetting(true);
    setResetMsg("");
    try {
      const res = await fetch("/api/admin/reset-topups", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResetMsg(`Done - ${data.transactionsDeleted} transactions deleted, ${data.usersAffected} users affected.`);
      setTimeout(() => window.location.reload(), 1500);
    } catch (err) {
      setResetMsg(err instanceof Error ? err.message : "Failed");
    } finally {
      setResetting(false);
    }
  }

  async function handleGenerateReport() {
    if (!stats) return;
    setReportLoading(true);
    setReportError("");
    try {
      const res = await fetch("/api/admin/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stats }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate report");
      setReport(data.report);
      setActiveTab("overview");
    } catch (err) {
      setReportError(err instanceof Error ? err.message : "Failed to generate report");
    } finally {
      setReportLoading(false);
    }
  }

  async function handleCopyReport() {
    if (!report) return;
    await navigator.clipboard.writeText(report.markdown);
    setCopyLabel("Copied");
    setTimeout(() => setCopyLabel("Copy Report"), 1200);
  }

  function handleSort(nextKey: SortKey) {
    if (sortKey === nextKey) {
      setSortDirection(p => p === "asc" ? "desc" : "asc");
      return;
    }
    setSortKey(nextKey);
    setSortDirection(nextKey === "signupDate" || nextKey === "creditsRemaining" ? "desc" : "asc");
  }

  const sortedUsers = useMemo(() => {
    if (!stats) return [];
    return [...stats.users].sort((a, b) => {
      const dir = sortDirection === "asc" ? 1 : -1;
      if (sortKey === "creditsRemaining") return (a.creditsRemaining - b.creditsRemaining) * dir;
      if (sortKey === "signupDate") {
        const aT = a.signupDate ? new Date(a.signupDate).getTime() : 0;
        const bT = b.signupDate ? new Date(b.signupDate).getTime() : 0;
        return (aT - bT) * dir;
      }
      return a[sortKey].localeCompare(b[sortKey]) * dir;
    });
  }, [sortDirection, sortKey, stats]);

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
        <Card className="px-6 py-5 text-center">
          <p className="text-white font-semibold mb-2">Could not load admin dashboard</p>
          <p style={{ color: "#64748B" }}>{error || "Unknown error"}</p>
        </Card>
      </div>
    );
  }

  const { userStats, creditActivity, tokenStats, departmentFunnel, signupTrend, topUsers, recentActivity, revenue, feedback, timeWindows } = stats;
  const funnelMax = Math.max(...departmentFunnel.map(d => d.count), 1);
  const tokenMax = Math.max(...Object.values(tokenStats.byModule).map(m => m.total), 1);
  const usageMax = Math.max(...Object.values(creditActivity.usageBreakdown), 1);
  const grantMax = Math.max(...Object.values(creditActivity.grantBreakdown), 1);
  const wowColor = userStats.thisWeekSignups >= userStats.lastWeekSignups ? "#22C55E" : "#EF4444";

  const TABS: Array<{ key: TabKey; label: string }> = [
    { key: "overview", label: "Overview" },
    { key: "funnel", label: "Funnel" },
    { key: "revenue", label: "Revenue" },
    { key: "feedback", label: "Feedback" },
    { key: "tokens", label: "Tokens" },
    { key: "users", label: "Users" },
  ];

  return (
    <div className="min-h-screen px-4 md:px-6 py-8" style={{ background: "#0B1120", color: "#fff" }}>
      <div className="max-w-7xl mx-auto">

        <div className="mb-6 flex items-end justify-between gap-4 flex-wrap">
          <div>
            <p className="text-[10px] font-bold tracking-widest uppercase mb-1" style={{ color: "#2B7EC9" }}>Owner Dashboard</p>
            <h1 className="text-3xl font-black text-white">Command Center</h1>
            <p className="text-sm mt-1" style={{ color: "#64748B" }}>Live app awareness - refreshes every 30s</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={handleGenerateReport}
              disabled={reportLoading}
              className="px-4 py-2.5 rounded-xl text-xs font-black transition-all hover:brightness-110 disabled:opacity-50"
              style={{ background: "linear-gradient(135deg, #F5A623, #EC4899)", color: "#fff" }}
            >
              {reportLoading ? "Generating..." : "Generate Report & Analysis"}
            </button>
            <a href="/" className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all hover:brightness-110" style={{ background: "#1E293B", color: "#94A3B8", border: "1px solid #1E2D45" }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
              Back to App
            </a>
            <div className="rounded-xl px-4 py-3 text-right" style={{ background: "#0F172A", border: "1px solid #1E2D45" }}>
              <p className="text-[10px] font-bold tracking-widest uppercase" style={{ color: "#64748B" }}>Last Refresh</p>
              <p className="text-sm text-white mt-1">{timeAgo(stats.fetchedAt)}</p>
            </div>
          </div>
        </div>

        {reportError && (
          <div className="mb-4 rounded-xl px-4 py-3 text-sm" style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.35)", color: "#FCA5A5" }}>
            {reportError}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-4 mb-6">
          <Card className="p-5">
            <p className="text-[10px] font-bold tracking-widest uppercase" style={{ color: "#64748B" }}>App Health</p>
            <div className="flex items-end gap-2 mt-2">
              <p className="text-5xl font-black" style={{ color: scoreColor(stats.healthScore) }}>{stats.healthScore}</p>
              <p className="text-sm mb-2" style={{ color: "#64748B" }}>/ 100</p>
            </div>
            <div className="h-2 rounded-full mt-4" style={{ background: "#1E293B" }}>
              <div className="h-2 rounded-full" style={{ width: `${stats.healthScore}%`, background: scoreColor(stats.healthScore) }} />
            </div>
            <p className="text-xs mt-3" style={{ color: "#94A3B8" }}>
              Calibrated from activation, revenue, feedback, pending topups, and zero-credit risk.
            </p>
          </Card>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {stats.alerts.slice(0, 3).map((alert, i) => <AlertCard key={`${alert.title}-${i}`} alert={alert} />)}
          </div>
        </div>

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

        {activeTab === "overview" && (
          <div className="space-y-6">
            {report && <ReportPanel report={report} onCopy={handleCopyReport} copyLabel={copyLabel} />}

            <div>
              <SectionHeader title="Time Windows" sub="Today, last 7 days, last 30 days, and all time" />
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[
                  { label: "Today", data: timeWindows.today },
                  { label: "7 Days", data: timeWindows.sevenDays },
                  { label: "30 Days", data: timeWindows.thirtyDays },
                  { label: "All Time", data: timeWindows.allTime },
                ].map(row => (
                  <Card key={row.label} className="p-4">
                    <p className="text-white font-bold text-sm">{row.label}</p>
                    <div className="grid grid-cols-2 gap-3 mt-4">
                      <div><p className="text-xl font-black text-white">{formatNumber(row.data.signups)}</p><p className="text-[10px]" style={{ color: "#64748B" }}>signups</p></div>
                      <div><p className="text-xl font-black text-white">{formatNumber(row.data.activeUsers)}</p><p className="text-[10px]" style={{ color: "#64748B" }}>active</p></div>
                      <div><p className="text-xl font-black text-white">{formatPhp(row.data.revenuePhp)}</p><p className="text-[10px]" style={{ color: "#64748B" }}>revenue</p></div>
                      <div><p className="text-xl font-black text-white">{formatNumber(row.data.creditsConsumed)}</p><p className="text-[10px]" style={{ color: "#64748B" }}>credits used</p></div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>

            <div>
              <SectionHeader title="Growth And Retention" sub="User acquisition and return signals" />
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <KPICard label="Total Users" value={formatNumber(userStats.totalSignups)} sub={`${userStats.newToday} today`} />
                <KPICard label="This Week" value={formatNumber(userStats.thisWeekSignups)} sub={wowLabel(userStats.thisWeekSignups, userStats.lastWeekSignups)} tone={wowColor} />
                <KPICard label="Active Users" value={formatNumber(userStats.activeUsers)} sub={`${pct(userStats.activeUsers, userStats.totalSignups)} activated`} />
                <KPICard label="Return Users" value={formatNumber(userStats.returnUsers)} sub={`${userStats.returnRate}% return rate`} />
                <KPICard label="Churn Risk" value={formatNumber(userStats.usersAtZero)} sub="users at 0 credits" tone={userStats.usersAtZero > 0 ? "#EF4444" : "#22C55E"} />
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card className="p-5">
                <SectionHeader title="Signup Trend - Last 14 Days" sub="New users per day" />
                <BarChart data={signupTrend.map(d => ({ label: d.label, value: d.count }))} color="#2B7EC9" />
              </Card>
              <Card className="p-5">
                <SectionHeader title="Recommended Actions" sub="Generated from current alerts" />
                <div className="space-y-3">
                  {stats.recommendedActions.slice(0, 5).map((action, i) => (
                    <div key={action} className="flex gap-3">
                      <span className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black shrink-0" style={{ background: "#1E293B", color: "#F5A623" }}>{i + 1}</span>
                      <p className="text-sm" style={{ color: "#CBD5E1" }}>{action}</p>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <KPICard label="Approved Revenue" value={formatPhp(revenue.approvedRevenuePhp)} sub={`${revenue.approvedTopupCount} topups`} tone="#22C55E" />
              <KPICard label="Pending Revenue" value={formatPhp(revenue.pendingRevenuePhp)} sub={`${revenue.pendingTopupCount} requests`} tone={revenue.pendingTopupCount ? "#F5A623" : "#64748B"} />
              <KPICard label="Free To Paid" value={`${revenue.freeToPaidRate}%`} sub={`${revenue.paidUsers} paid users`} />
              <KPICard label="Feedback Rating" value={`${feedback.averageRating.toFixed(1)}/5`} sub={`${feedback.total} feedbacks`} tone={feedback.averageRating >= 4 ? "#22C55E" : "#F5A623"} />
            </div>

            <Card className="overflow-hidden">
              <div className="px-5 py-4 border-b" style={{ borderColor: "#1E2D45" }}>
                <SectionHeader title="Live Activity" sub="Last 20 credit transactions" />
              </div>
              <div className="max-h-80 overflow-auto">
                {recentActivity.map((a, i) => (
                  <div key={`${a.userId}-${a.createdAt}-${i}`} className="px-5 py-3 flex items-center justify-between gap-3" style={{ borderTop: i === 0 ? "none" : "1px solid #1E2D45" }}>
                    <div className="min-w-0">
                      <p className="text-white font-semibold text-sm truncate">{a.username}</p>
                      <p className="text-xs mt-0.5 truncate" style={{ color: "#94A3B8" }}>{a.type} - {a.description || "No description"}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold" style={{ color: a.amount >= 0 ? "#22C55E" : "#EF4444" }}>{a.amount >= 0 ? "+" : ""}{a.amount}</p>
                      <p className="text-xs mt-0.5" style={{ color: "#64748B" }}>{timeAgo(a.createdAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {activeTab === "funnel" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-4">
              <FunnelTable steps={stats.activationFunnel} />
              <Card className="p-5">
                <SectionHeader title="Department Usage" sub="Credit-consuming actions by feature" />
                <div className="space-y-1">
                  {["research", "angles", "creative", "copy", "analyze", "video", "consultation"].map(mod => {
                    const d = departmentFunnel.find(f => f.module === mod);
                    return (
                      <HorizontalBar
                        key={mod}
                        label={DEPT_LABELS[mod]}
                        value={d?.count || 0}
                        max={funnelMax}
                        color={DEPT_COLORS[mod]}
                        sub={`${d?.uniqueUsers || 0} users`}
                      />
                    );
                  })}
                </div>
              </Card>
            </div>

            <Card className="overflow-hidden">
              <div className="px-5 py-4 border-b" style={{ borderColor: "#1E2D45" }}>
                <SectionHeader title="Top 10 Power Users" sub="Highest credit consumption - strongest upsell and testimonial candidates" />
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
                        <td className="px-4 py-3"><PlanPill plan={u.plan} /></td>
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
            </Card>
          </div>
        )}

        {activeTab === "revenue" && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <KPICard label="Approved Revenue" value={formatPhp(revenue.approvedRevenuePhp)} sub={`${revenue.approvedTopupCount} approved`} tone="#22C55E" />
              <KPICard label="Pending Revenue" value={formatPhp(revenue.pendingRevenuePhp)} sub={`${revenue.pendingTopupCount} pending`} tone={revenue.pendingTopupCount ? "#F5A623" : "#64748B"} />
              <KPICard label="Approval Rate" value={`${revenue.approvalRate}%`} sub={`${revenue.rejectedTopupCount} rejected`} />
              <KPICard label="Average Order" value={formatPhp(revenue.avgOrderValuePhp)} sub={revenue.topPackage} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card className="p-5">
                <SectionHeader title="Credit Sources" sub="Where credits are issued from" />
                {[
                  { label: "Top-up paid", value: creditActivity.grantBreakdown.topup, color: "#22C55E" },
                  { label: "Signup bonus", value: creditActivity.grantBreakdown.signup, color: "#2B7EC9" },
                  { label: "Referral rewards", value: creditActivity.grantBreakdown.referral, color: "#8B5CF6" },
                  { label: "Feedback rewards", value: creditActivity.grantBreakdown.feedback, color: "#F5A623" },
                  { label: "Campaign launch", value: creditActivity.grantBreakdown.campaignLaunch, color: "#EC4899" },
                  { label: "Other", value: creditActivity.grantBreakdown.other, color: "#64748B" },
                ].map(row => <HorizontalBar key={row.label} label={row.label} value={row.value} max={grantMax} color={row.color} />)}
              </Card>

              <Card className="p-5">
                <SectionHeader title="Credit Spend" sub="Where users spend credits" />
                {[
                  { label: "Creative images", value: creditActivity.usageBreakdown.creative, color: "#EC4899" },
                  { label: "Advanced audit", value: creditActivity.usageBreakdown.analyzeAdvanced, color: "#FBBF24" },
                  { label: "Research", value: creditActivity.usageBreakdown.research, color: "#10B981" },
                  { label: "Angles", value: creditActivity.usageBreakdown.angles, color: "#F5A623" },
                  { label: "Copy", value: creditActivity.usageBreakdown.copy, color: "#8B5CF6" },
                  { label: "Video generation", value: creditActivity.usageBreakdown.videoGeneration, color: "#38BDF8" },
                  { label: "Consultation", value: creditActivity.usageBreakdown.consultation, color: "#22C55E" },
                  { label: "Other", value: creditActivity.usageBreakdown.other, color: "#64748B" },
                ].map(row => <HorizontalBar key={row.label} label={row.label} value={row.value} max={usageMax} color={row.color} />)}
              </Card>
            </div>

            <Card className="p-5">
              <SectionHeader title="Revenue Calibration" sub="Simple checks for whether credits and revenue are aligned" />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <KPICard label="Credits Sold" value={formatNumber(revenue.approvedTopupCredits)} sub="approved top-up credits" />
                <KPICard label="Credits Burned" value={formatNumber(creditActivity.totalCreditsConsumed)} sub={`${pct(creditActivity.totalCreditsConsumed, creditActivity.totalCreditsIssued)} of issued credits`} />
                <KPICard label="Free To Paid" value={`${revenue.freeToPaidRate}%`} sub={`${revenue.paidUsers} paid users`} tone={revenue.freeToPaidRate > 0 ? "#22C55E" : "#F5A623"} />
              </div>
            </Card>
          </div>
        )}

        {activeTab === "feedback" && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <KPICard label="Total Feedback" value={formatNumber(feedback.total)} />
              <KPICard label="Average Rating" value={`${feedback.averageRating.toFixed(1)}/5`} tone={feedback.averageRating >= 4 ? "#22C55E" : "#F5A623"} />
              <KPICard label="Testimonial Candidates" value={formatNumber(feedback.testimonialCandidates)} sub="4 to 5 star users" />
              <KPICard label="Prompt Conversion" value={feedback.promptToFeedbackRate === null ? "N/A" : `${feedback.promptToFeedbackRate}%`} sub={`${feedback.promptShownCount} prompts shown`} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card className="p-5">
                <SectionHeader title="Feedback Health" sub="Quality and reward economics" />
                <HorizontalBar label="High rating feedback" value={feedback.highRatingCount} max={Math.max(feedback.total, 1)} color="#22C55E" />
                <HorizontalBar label="Low rating feedback" value={feedback.lowRatingCount} max={Math.max(feedback.total, 1)} color="#EF4444" />
                <HorizontalBar label="Feedback reward credits" value={feedback.rewardCreditsIssued} max={Math.max(creditActivity.totalCreditsIssued, 1)} color="#F5A623" />
              </Card>
              <Card className="p-5">
                <SectionHeader title="Feedback Interpretation" sub="How to read this section" />
                <div className="space-y-3 text-sm" style={{ color: "#CBD5E1" }}>
                  <p>If prompt conversion is low, the modal timing or reward copy needs work.</p>
                  <p>If rating is below 4.0, read feedback before adding new features.</p>
                  <p>If testimonial candidates are growing, ask those users for public proof.</p>
                </div>
              </Card>
            </div>
          </div>
        )}

        {activeTab === "tokens" && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <KPICard label="Total Tokens" value={formatNumber(tokenStats.grandTotalTokens)} sub="all departments" />
              <KPICard label="Est. API Cost" value={`$${tokenStats.estCostUSD.toFixed(4)}`} sub="Gemini estimate" />
              <KPICard label="Avg Cost / Call" value={(() => {
                const totalCalls = Object.values(tokenStats.byModule).reduce((s, m) => s + m.calls, 0);
                return totalCalls ? `$${(tokenStats.estCostUSD / totalCalls).toFixed(5)}` : "$0.0000";
              })()} />
              <KPICard label="Video Clips" value={formatNumber(stats.videoUnlocks.generatedClips)} sub="generated clips" />
            </div>

            <Card className="p-5">
              <SectionHeader title="Token Usage by Department" sub="Logged AI calls by module" />
              <div className="space-y-1">
                {["research", "angles", "copy", "analyze", "creative", "video"].map(mod => {
                  const m = tokenStats.byModule[mod] || { total: 0, calls: 0 };
                  return <HorizontalBar key={mod} label={DEPT_LABELS[mod]} value={m.total} max={tokenMax} color={DEPT_COLORS[mod]} sub={`${m.calls} calls`} />;
                })}
              </div>
            </Card>

            <Card className="overflow-hidden">
              <div className="px-5 py-4 border-b" style={{ borderColor: "#1E2D45" }}>
                <SectionHeader title="Token Breakdown" sub="Input, output, and estimated cost" />
              </div>
              <div className="overflow-auto">
                <table className="w-full text-sm">
                  <thead style={{ background: "#111827" }}>
                    <tr>
                      {["Department", "Calls", "Input", "Output", "Total", "Cost"].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-bold uppercase tracking-widest" style={{ color: "#64748B" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {["research", "angles", "copy", "analyze", "creative", "video"].map(mod => {
                      const m = tokenStats.byModule[mod] || { prompt: 0, completion: 0, total: 0, calls: 0 };
                      const cost = (m.prompt / 1_000_000) * 0.15 + (m.completion / 1_000_000) * 0.60;
                      return (
                        <tr key={mod} style={{ borderTop: "1px solid #1E2D45" }}>
                          <td className="px-4 py-3 text-white font-medium">{DEPT_LABELS[mod]}</td>
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
            </Card>
          </div>
        )}

        {activeTab === "users" && (
          <div className="space-y-6">
            <Card className="overflow-hidden">
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
                          className="px-4 py-3 text-left text-xs font-bold uppercase tracking-widest cursor-pointer whitespace-nowrap"
                          style={{ color: "#64748B" }}
                          onClick={() => handleSort(col.key as SortKey)}
                        >
                          {col.label}
                          {sortKey === col.key && <span style={{ color: "#2B7EC9" }}> {sortDirection === "asc" ? "up" : "down"}</span>}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sortedUsers.map(u => (
                      <tr key={u.userId} style={{ borderTop: "1px solid #1E2D45" }}>
                        <td className="px-4 py-3 text-white font-medium">{u.username}</td>
                        <td className="px-4 py-3" style={{ color: "#94A3B8" }}>{u.email || "N/A"}</td>
                        <td className="px-4 py-3"><PlanPill plan={u.plan} /></td>
                        <td className="px-4 py-3 text-white">{formatNumber(u.creditsRemaining)}</td>
                        <td className="px-4 py-3" style={{ color: "#94A3B8" }}>{formatDate(u.signupDate)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            {stats.dataQuality.warnings.length > 0 && (
              <Card className="p-5">
                <SectionHeader title="Data Quality Warnings" sub="Optional data that could not be loaded" />
                <div className="space-y-2">
                  {stats.dataQuality.warnings.map(w => (
                    <p key={w} className="text-xs" style={{ color: "#F5A623" }}>{w}</p>
                  ))}
                </div>
              </Card>
            )}

            <details className="rounded-xl" style={{ background: "#0F172A", border: "1px solid rgba(239,68,68,0.35)" }}>
              <summary className="cursor-pointer px-5 py-4 text-sm font-bold" style={{ color: "#EF4444" }}>Danger Zone</summary>
              <div className="px-5 pb-5">
                <p className="text-xs mb-4" style={{ color: "#94A3B8" }}>Use only when you intentionally need to remove top-up transaction data and reverse those credits.</p>
                <button
                  onClick={handleResetTopups}
                  disabled={resetting}
                  className="px-4 py-2 rounded-xl text-xs font-bold transition-all hover:brightness-110 disabled:opacity-50"
                  style={{ background: "rgba(239,68,68,0.15)", color: "#EF4444", border: "1px solid rgba(239,68,68,0.3)" }}
                >
                  {resetting ? "Resetting..." : "Reset Topup Data"}
                </button>
                {resetMsg && <p className="text-[10px] mt-2" style={{ color: "#94A3B8" }}>{resetMsg}</p>}
              </div>
            </details>
          </div>
        )}
      </div>
    </div>
  );
}

function PlanPill({ plan }: { plan: string }) {
  return (
    <span
      className="text-xs font-bold px-2 py-1 rounded-full whitespace-nowrap"
      style={{
        background: plan === "Max" ? "rgba(239,68,68,0.15)" : plan === "Flex" ? "rgba(245,166,35,0.15)" : "rgba(156,163,175,0.15)",
        color: plan === "Max" ? "#EF4444" : plan === "Flex" ? "#F5A623" : "#9CA3AF",
      }}
    >
      {plan}
    </span>
  );
}
