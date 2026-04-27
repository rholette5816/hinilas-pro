import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isOwnerUser } from "@/lib/admin";

type ReportStats = {
  healthScore?: number;
  userStats?: {
    totalSignups?: number;
    newToday?: number;
    new7d?: number;
    new30d?: number;
    activeUsers?: number;
    returnUsers?: number;
    usersAtZero?: number;
    noUsageUsers?: number;
    returnRate?: number;
  };
  revenue?: {
    approvedRevenuePhp?: number;
    pendingRevenuePhp?: number;
    approvedTopupCount?: number;
    pendingTopupCount?: number;
    freeToPaidRate?: number;
    avgOrderValuePhp?: number;
    paidUsers?: number;
    topPackage?: string;
  };
  feedback?: {
    total?: number;
    averageRating?: number;
    highRatingCount?: number;
    lowRatingCount?: number;
    promptShownCount?: number;
    promptToFeedbackRate?: number | null;
  };
  creditActivity?: {
    totalCreditsIssued?: number;
    totalCreditsConsumed?: number;
    usageBreakdown?: Record<string, number>;
  };
  activationFunnel?: Array<{
    key: string;
    label: string;
    count: number;
    rateFromPrevious: number | null;
    rateFromSignup: number | null;
  }>;
  alerts?: Array<{
    level: "good" | "info" | "warning" | "critical";
    title: string;
    message: string;
    action: string;
  }>;
  recommendedActions?: string[];
  timeWindows?: Record<string, {
    signups?: number;
    activeUsers?: number;
    revenuePhp?: number;
    creditsConsumed?: number;
    feedbacks?: number;
    launchesSubmitted?: number;
  }>;
  tokenStats?: {
    grandTotalTokens?: number;
    estCostUSD?: number;
  };
  fetchedAt?: string;
};

function num(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function fmt(value: unknown) {
  return new Intl.NumberFormat("en-PH").format(num(value));
}

function php(value: unknown) {
  return `PHP ${Math.round(num(value)).toLocaleString("en-PH")}`;
}

function pct(value: unknown) {
  return `${Math.round(num(value))}%`;
}

function lineItems(items: string[]) {
  if (items.length === 0) return "- No notable items.";
  return items.map(item => `- ${item}`).join("\n");
}

function buildReport(stats: ReportStats) {
  const userStats = stats.userStats || {};
  const revenue = stats.revenue || {};
  const feedback = stats.feedback || {};
  const creditActivity = stats.creditActivity || {};
  const tokenStats = stats.tokenStats || {};
  const windows = stats.timeWindows || {};
  const sevenDays = windows.sevenDays || {};
  const thirtyDays = windows.thirtyDays || {};
  const alerts = stats.alerts || [];
  const funnel = stats.activationFunnel || [];

  const criticalAlerts = alerts.filter(a => a.level === "critical");
  const warningAlerts = alerts.filter(a => a.level === "warning");
  const goodAlerts = alerts.filter(a => a.level === "good");

  const weakestFunnelStep = funnel
    .filter(step => step.rateFromPrevious !== null && step.key !== "signed_up")
    .sort((a, b) => (a.rateFromPrevious ?? 101) - (b.rateFromPrevious ?? 101))[0];

  const usage = creditActivity.usageBreakdown || {};
  const topUsage = Object.entries(usage)
    .sort((a, b) => num(b[1]) - num(a[1]))
    .slice(0, 3)
    .map(([key, value]) => `${key}: ${fmt(value)} credits`);

  const wins = [
    num(revenue.approvedRevenuePhp) > 0
      ? `Revenue is confirmed at ${php(revenue.approvedRevenuePhp)} from ${fmt(revenue.approvedTopupCount)} approved top-up(s).`
      : "",
    num(userStats.activeUsers) > 0
      ? `${fmt(userStats.activeUsers)} user(s) have consumed credits, so product usage is happening.`
      : "",
    num(feedback.averageRating) >= 4
      ? `Feedback quality is strong at ${Number(feedback.averageRating).toFixed(1)}/5.`
      : "",
    goodAlerts[0]?.message || "",
  ].filter(Boolean);

  const risks = [
    ...criticalAlerts.map(a => `${a.title}: ${a.message}`),
    ...warningAlerts.map(a => `${a.title}: ${a.message}`),
    weakestFunnelStep
      ? `Weakest funnel step: ${weakestFunnelStep.label} at ${weakestFunnelStep.rateFromPrevious}% from previous step.`
      : "",
  ].filter(Boolean);

  const actions = stats.recommendedActions?.length
    ? stats.recommendedActions
    : alerts.filter(a => a.level !== "good").map(a => a.action);

  const generatedAt = new Date().toLocaleString("en-PH", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  const markdown = `# Hinilas Pro Admin Report

Generated: ${generatedAt}
Health score: ${fmt(stats.healthScore)} / 100

## Executive Summary
- Total users: ${fmt(userStats.totalSignups)}
- New users today: ${fmt(userStats.newToday)}
- New users in last 7 days: ${fmt(userStats.new7d)}
- Active users: ${fmt(userStats.activeUsers)}
- Return users: ${fmt(userStats.returnUsers)} (${pct(userStats.returnRate)})
- Users at 0 credits: ${fmt(userStats.usersAtZero)}
- Approved revenue: ${php(revenue.approvedRevenuePhp)}
- Pending revenue: ${php(revenue.pendingRevenuePhp)}
- Free-to-paid rate: ${pct(revenue.freeToPaidRate)}

## Last 7 Days
- Signups: ${fmt(sevenDays.signups)}
- Active users: ${fmt(sevenDays.activeUsers)}
- Revenue: ${php(sevenDays.revenuePhp)}
- Credits consumed: ${fmt(sevenDays.creditsConsumed)}
- Feedback submitted: ${fmt(sevenDays.feedbacks)}
- Launch proofs submitted: ${fmt(sevenDays.launchesSubmitted)}

## Last 30 Days
- Signups: ${fmt(thirtyDays.signups)}
- Active users: ${fmt(thirtyDays.activeUsers)}
- Revenue: ${php(thirtyDays.revenuePhp)}
- Credits consumed: ${fmt(thirtyDays.creditsConsumed)}

## Wins
${lineItems(wins)}

## Risks And Alerts
${lineItems(risks)}

## Funnel Diagnosis
${lineItems(funnel.map(step => `${step.label}: ${fmt(step.count)} users${step.rateFromPrevious === null ? "" : `, ${step.rateFromPrevious}% from previous step`}`))}

## Credit And Revenue Health
- Credits issued: ${fmt(creditActivity.totalCreditsIssued)}
- Credits consumed: ${fmt(creditActivity.totalCreditsConsumed)}
- Average order value: ${php(revenue.avgOrderValuePhp)}
- Paid users: ${fmt(revenue.paidUsers)}
- Top package: ${revenue.topPackage || "N/A"}
- Top credit usage: ${topUsage.length ? topUsage.join(", ") : "No usage yet"}
- Estimated API cost: $${num(tokenStats.estCostUSD).toFixed(4)}

## Feedback Health
- Total feedback: ${fmt(feedback.total)}
- Average rating: ${num(feedback.averageRating).toFixed(1)} / 5
- High-rating feedback: ${fmt(feedback.highRatingCount)}
- Low-rating feedback: ${fmt(feedback.lowRatingCount)}
- Prompt shown: ${fmt(feedback.promptShownCount)}
- Prompt-to-feedback rate: ${feedback.promptToFeedbackRate === null || feedback.promptToFeedbackRate === undefined ? "N/A" : pct(feedback.promptToFeedbackRate)}

## Recommended Actions
${lineItems(actions.slice(0, 7))}
`;

  return {
    generatedAt,
    summary: {
      healthScore: num(stats.healthScore),
      criticalAlerts: criticalAlerts.length,
      warningAlerts: warningAlerts.length,
      weakestFunnelStep: weakestFunnelStep?.label || null,
    },
    wins,
    risks,
    actions: actions.slice(0, 7),
    markdown,
  };
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!isOwnerUser(user)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const stats = body?.stats as ReportStats | undefined;
  if (!stats) {
    return NextResponse.json({ error: "Missing stats payload" }, { status: 400 });
  }

  return NextResponse.json({ report: buildReport(stats) });
}
