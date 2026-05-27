"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import AIOutput from "@/components/AIOutput";
import TierLock from "@/components/TierLock";
import { useApp, buildUserContext } from "@/lib/context";
import { MODULE_PROMPTS, HILAS_KNOWLEDGE } from "@/lib/knowledge";
import { createClient } from "@/lib/supabase/client";

const BASIC_COLUMNS = [
  "Conversations Started",
  "Cost per Messaging Conversation",
  "Amount Spent",
  "CTR (Link Click-Through Rate)",
  "CPC (Cost per Link Click)",
  "CPM (Cost per 1,000 Impressions)",
  "Frequency",
];

const ADVANCED_COLUMNS = [
  "Amount Spent",
  "Results",
  "Cost per Result",
  "Result ROAS",
  "Result Value",
  "CTR (Link Click-Through Rate)",
  "3-Second Video Views",
  "ThruPlays",
  "Impressions",
  "Landing Page Views",
  "Add to Cart",
  "Initiate Checkout",
  "CPM",
  "Frequency",
];

type Mode = "basic" | "advanced";

function PInput({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-400 mb-1">{label}</label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">P</span>
        <input
          type="number"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-white border border-slate-200 rounded-lg py-2.5 pl-7 pr-3 text-[#1c1e21] placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
    </div>
  );
}

type AnalyzeVideoKey = "analyze_basic" | "analyze_advanced";

export default function AnalyzePage() {
  const { setup, credits, refreshCredits, plan, analyzeOutput, setAnalyzeOutput } = useApp();
  const router = useRouter();
  const [mode, setMode] = useState<Mode | null>(null);
  const isLite = plan === "lite";
  const isMax = plan === "max";

  // Basic state
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [productPrice, setProductPrice] = useState("");
  const [productCost, setProductCost] = useState("");
  const [amountSpent, setAmountSpent] = useState("");
  const [numSales, setNumSales] = useState("");

  // Advanced state
  const [csvText, setCsvText] = useState<string | null>(null);
  const [csvFileName, setCsvFileName] = useState("");
  const [sellingPrice, setSellingPrice] = useState("");
  const [cogs, setCogs] = useState("");
  const [shippingFee, setShippingFee] = useState("");
  const [rtsPercent, setRtsPercent] = useState("");

  const [outputBasic, setOutputBasic] = useState("");
  const [outputAdvanced, setOutputAdvanced] = useState("");
  const [savedAtBasic, setSavedAtBasic] = useState<string | null>(null);
  const [savedAtAdvanced, setSavedAtAdvanced] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [showReport, setShowReport] = useState(false);
  const [userName, setUserName] = useState("User");
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const csvRef = useRef<HTMLInputElement>(null);
  const reportRef = useRef<HTMLDivElement>(null);

  const [videos, setVideos] = useState<Record<AnalyzeVideoKey, { unlocked: boolean; expiresAt: string | null }>>({
    analyze_basic: { unlocked: false, expiresAt: null },
    analyze_advanced: { unlocked: false, expiresAt: null },
  });
  const [unlockingVideo, setUnlockingVideo] = useState<AnalyzeVideoKey | null>(null);
  const [videoNoCredits, setVideoNoCredits] = useState(false);

  useEffect(() => {
    fetch("/api/video-rewards").then(r => r.json()).then(data => {
      if (data.videos) {
        setVideos({
          analyze_basic: data.videos.analyze_basic,
          analyze_advanced: data.videos.analyze_advanced,
        });
      }
    }).catch(() => {});
  }, []);

  async function unlockVideo(videoKey: AnalyzeVideoKey) {
    if (videos[videoKey].unlocked || unlockingVideo) return;
    setUnlockingVideo(videoKey);
    setVideoNoCredits(false);
    try {
      const res = await fetch("/api/video-rewards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoKey }),
      });
      const data = await res.json();
      if (res.status === 402 || data.code === "NO_CREDITS") {
        setVideoNoCredits(true);
        return;
      }
      if (res.ok) {
        setVideos(prev => ({ ...prev, [videoKey]: { unlocked: true, expiresAt: data.expiresAt } }));
        await refreshCredits();
      }
    } finally {
      setUnlockingVideo(null);
    }
  }

  // Load user name
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserName(user.user_metadata?.full_name || user.email || "User");
    });
  }, []);

  // Restore last analyses from context (Supabase-persisted)
  useEffect(() => {
    if (analyzeOutput?.basic?.output) { setOutputBasic(analyzeOutput.basic.output); setSavedAtBasic(analyzeOutput.basic.savedAt); }
    if (analyzeOutput?.advanced?.output) { setOutputAdvanced(analyzeOutput.advanced.output); setSavedAtAdvanced(analyzeOutput.advanced.savedAt); }
  }, [analyzeOutput]);

  const output = mode === "advanced" ? outputAdvanced : outputBasic;
  const savedAt = mode === "advanced" ? savedAtAdvanced : savedAtBasic;

  function buildBudgetSummary() {
    if (mode === "basic") {
      const spent = parseFloat(amountSpent) || 0;
      const sales = parseFloat(numSales) || 0;
      const price = parseFloat(productPrice) || 0;
      const cost = parseFloat(productCost) || 0;
      if (!spent && !sales && !price && !cost) return null;
      const revenue = price * sales;
      const totalCost = cost * sales;
      const profit = revenue - totalCost - spent;
      const roas = spent > 0 ? (revenue / spent).toFixed(2) : null;
      return {
        stats: [
          { label: "Amount Spent", value: spent > 0 ? `₱${spent.toLocaleString()}` : "—", sub: "Ad Budget Used" },
          { label: "Sales / Orders", value: sales > 0 ? sales.toLocaleString() : "—", sub: "Conversions" },
          { label: "Revenue", value: revenue > 0 ? `₱${revenue.toLocaleString()}` : "—", sub: `₱${price} × ${sales} orders` },
          { label: "Net Profit", value: (profit !== 0 || spent > 0) ? `₱${profit.toLocaleString()}` : "—", sub: "After cost & ad spend", color: profit >= 0 ? "#22c55e" : "#ef4444" },
        ],
        roas,
        verdict: roas ? (parseFloat(roas) >= 3 ? "Profitable" : parseFloat(roas) >= 1.5 ? "Break-even Zone" : "Losing Money") : null,
        verdictColor: roas ? (parseFloat(roas) >= 3 ? "#22c55e" : parseFloat(roas) >= 1.5 ? "#eab308" : "#ef4444") : "#64748B",
      };
    } else {
      const spent = parseFloat(amountSpent) || 0;
      const price = parseFloat(sellingPrice) || 0;
      const cost = parseFloat(cogs) || 0;
      const ship = parseFloat(shippingFee) || 0;
      const rts = parseFloat(rtsPercent) || 0;
      if (!spent && !price && !cost) return null;
      // Parse sales count from CSV if possible — use numSales as fallback
      const sales = parseFloat(numSales) || 0;
      const delivered = sales * (1 - rts / 100);
      const revenue = price * delivered;
      const totalCogs = cost * delivered;
      const totalShip = ship * sales;
      const profit = revenue - totalCogs - totalShip - spent;
      const roas = spent > 0 ? (revenue / spent).toFixed(2) : null;
      return {
        stats: [
          { label: "Amount Spent", value: spent > 0 ? `₱${spent.toLocaleString()}` : "—", sub: "Ad Budget Used" },
          { label: "Est. Delivered", value: delivered > 0 ? Math.round(delivered).toLocaleString() : "—", sub: `${rts}% RTS rate` },
          { label: "Revenue", value: revenue > 0 ? `₱${revenue.toLocaleString()}` : "—", sub: `₱${price} × ${Math.round(delivered)} delivered` },
          { label: "Net Profit", value: profit !== 0 ? `₱${profit.toLocaleString()}` : "—", sub: "After COGS, shipping & ads", color: profit >= 0 ? "#22c55e" : "#ef4444" },
        ],
        roas,
        verdict: roas ? (parseFloat(roas) >= 3 ? "Profitable" : parseFloat(roas) >= 1.5 ? "Break-even Zone" : "Losing Money") : null,
        verdictColor: roas ? (parseFloat(roas) >= 3 ? "#22c55e" : parseFloat(roas) >= 1.5 ? "#eab308" : "#ef4444") : "#64748B",
      };
    }
  }

  function downloadHTMLDeck() {
    if (!output) return;

    const sections: { title: string; lines: string[] }[] = [];
    let current: { title: string; lines: string[] } | null = null;
    for (const rawLine of output.split("\n")) {
      const line = rawLine.trim();
      if (line.startsWith("## ")) {
        if (current) sections.push(current);
        current = { title: line.slice(3), lines: [] };
      } else if (line && line !== "---" && line !== "***" && current) {
        current.lines.push(line);
      }
    }
    if (current) sections.push(current);

    function rl(line: string): string {
      return line
        .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
        .replace(/🟢/g, '<span class="dot-g">●</span>')
        .replace(/🟡/g, '<span class="dot-y">●</span>')
        .replace(/🔴/g, '<span class="dot-r">●</span>');
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    function statusBadge(line: string): string {
      const upper = line.toUpperCase();
      if (upper.includes("SCALE")) return '<span class="badge badge-scale">SCALE</span>';
      if (upper.includes("PAUSE")) return '<span class="badge badge-pause">PAUSE</span>';
      if (upper.includes("TEST")) return '<span class="badge badge-test">TEST</span>';
      return "";
    }

    function isMetricLine(line: string): boolean {
      return /🟢|🟡|🔴/.test(line) && /—|:/.test(line);
    }

    function isVerdictLine(line: string): boolean {
      const u = line.toUpperCase();
      return (u.includes("SCALE") || u.includes("PAUSE") || u.includes("TEST")) && line.includes(":");
    }

    function metricCard(line: string): string {
      const clean = line.replace(/^[-*]\s+/, "");
      const hasGreen = clean.includes("🟢");
      const hasYellow = clean.includes("🟡");
      const hasRed = clean.includes("🔴");
      const color = hasGreen ? "#22c55e" : hasYellow ? "#eab308" : hasRed ? "#ef4444" : "#64748B";
      const bg = hasGreen ? "rgba(34,197,94,0.08)" : hasYellow ? "rgba(234,179,8,0.08)" : hasRed ? "rgba(239,68,68,0.08)" : "rgba(148,163,184,0.06)";
      const text = clean.replace(/🟢|🟡|🔴/g, "").replace(/^[-*]\s+/, "").replace(/\*\*(.*?)\*\*/g, "$1").trim();
      return `<div class="metric-card" style="border-left:3px solid ${color};background:${bg}">
        <span class="metric-dot" style="color:${color}">●</span>
        <span class="metric-text">${text}</span>
      </div>`;
    }

    function verdictCard(line: string): string {
      const clean = line.replace(/^[-*]\s+/, "").replace(/\*\*(.*?)\*\*/g, "$1").trim();
      const upper = clean.toUpperCase();
      const isScale = upper.includes("SCALE");
      const isPause = upper.includes("PAUSE");
      const color = isScale ? "#22c55e" : isPause ? "#ef4444" : "#eab308";
      const bg = isScale ? "rgba(34,197,94,0.07)" : isPause ? "rgba(239,68,68,0.07)" : "rgba(234,179,8,0.07)";
      const label = isScale ? "SCALE" : isPause ? "PAUSE" : "TEST";
      const name = clean.replace(/✓\s*SCALE|✗\s*PAUSE|~\s*TEST|SCALE|PAUSE|TEST/gi, "").replace(/:/g, "").trim();
      return `<div class="verdict-card" style="border-left:4px solid ${color};background:${bg}">
        <div class="verdict-name">${name || clean}</div>
        <span class="badge" style="background:${color}20;color:${color};border:1px solid ${color}40">${label}</span>
      </div>`;
    }

    function renderSlideContent(title: string, lines: string[]): string {
      const t = title.toUpperCase();
      const isMetrics = t.includes("METRIC") || t.includes("SCORECARD") || t.includes("KPI");
      const isVerdict = t.includes("VERDICT") || t.includes("CAMPAIGN");
      const isFunnel = t.includes("FUNNEL");

      if (isMetrics) {
        const cards = lines.map(l => isMetricLine(l) ? metricCard(l) : `<div class="plain-line">${rl(l.replace(/^[-*]\s+/, ""))}</div>`).join("");
        return `<div class="cards-grid">${cards}</div>`;
      }
      if (isVerdict) {
        const cards = lines.map(l => {
          const clean = l.replace(/^[-*]\s+/, "");
          return isVerdictLine(clean) || /SCALE|PAUSE|TEST/i.test(clean) ? verdictCard(l) : `<div class="plain-line">${rl(clean)}</div>`;
        }).join("");
        return `<div class="verdict-list">${cards}</div>`;
      }
      if (isFunnel) {
        const funnelMatch = lines.find(l => /hook rate|hold rate|landing rate|cvr/i.test(l));
        const funnelSteps: { label: string; val: string }[] = [];
        if (funnelMatch) {
          const parts = funnelMatch.split(/→|->/).map(s => s.trim());
          parts.forEach(p => {
            const m = p.match(/(.+?):\s*([\d.]+%|\[N\/A\]%?)/i);
            if (m) funnelSteps.push({ label: m[1].trim(), val: m[2] });
          });
        }
        const funnel = funnelSteps.length > 1
          ? `<div class="funnel-row">${funnelSteps.map((s, i) => `
              <div class="funnel-step">
                <div class="funnel-val">${s.val}</div>
                <div class="funnel-label">${s.label}</div>
              </div>${i < funnelSteps.length - 1 ? '<div class="funnel-arrow">›</div>' : ""}
            `).join("")}</div>`
          : "";
        const rest = lines.filter(l => !funnelMatch || l !== funnelMatch).map(l => `<div class="callout-line">${rl(l.replace(/^[-*]\s+/, ""))}</div>`).join("");
        return funnel + `<div class="callout-block">${rest}</div>`;
      }
      // Default — callout cards
      return `<div class="callout-block">${lines.map(l => {
        const clean = l.replace(/^[-*]\s+/, "");
        return `<div class="callout-line">${rl(clean)}</div>`;
      }).join("")}</div>`;
    }

    const ICONS: Record<string, string> = {
      VERDICT: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`,
      METRIC: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>`,
      FUNNEL: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"/></svg>`,
      EXPERT: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/></svg>`,
      RECOMMEND: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>`,
      DEFAULT: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>`,
    };

    function getIcon(title: string): string {
      const t = title.toUpperCase();
      if (t.includes("VERDICT") || t.includes("CAMPAIGN")) return ICONS.VERDICT;
      if (t.includes("METRIC") || t.includes("SCORECARD")) return ICONS.METRIC;
      if (t.includes("FUNNEL")) return ICONS.FUNNEL;
      if (t.includes("EXPERT") || t.includes("DIAGNOSIS")) return ICONS.EXPERT;
      if (t.includes("RECOMMEND") || t.includes("ACTION")) return ICONS.RECOMMEND;
      return ICONS.DEFAULT;
    }

    const budget = buildBudgetSummary();
    const totalSlides = sections.length + 2 + (budget ? 1 : 0);
    let slidesHTML = "";
    let slideIdx = 0;

    // Cover slide
    slidesHTML += `
    <div class="slide active" id="slide-${slideIdx++}">
      <svg class="bg-orb orb1" viewBox="0 0 400 400"><circle cx="200" cy="200" r="200" fill="url(#g1)"/><defs><radialGradient id="g1"><stop offset="0%" stop-color="#1877F2" stop-opacity="0.25"/><stop offset="100%" stop-color="#1877F2" stop-opacity="0"/></radialGradient></defs></svg>
      <svg class="bg-orb orb2" viewBox="0 0 300 300"><circle cx="150" cy="150" r="150" fill="url(#g2)"/><defs><radialGradient id="g2"><stop offset="0%" stop-color="#7C3AED" stop-opacity="0.2"/><stop offset="100%" stop-color="#7C3AED" stop-opacity="0"/></radialGradient></defs></svg>
      <svg class="bg-grid" viewBox="0 0 100 100" preserveAspectRatio="none"><defs><pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse"><path d="M 10 0 L 0 0 0 10" fill="none" stroke="#1C1E21" stroke-width="0.5"/></pattern></defs><rect width="100" height="100" fill="url(#grid)"/></svg>
      <div class="cover-layout">
        <div class="cover-left">
          <div class="cover-tag">${mode === "advanced" ? "Advanced Analysis" : "Basic Analysis"}</div>
          <h1 class="cover-h1">Meta Ads<br/>Analysis<br/><span class="cover-h1-accent">Report</span></h1>
          <div class="cover-divider"></div>
          <div class="cover-meta">
            <div class="cover-meta-name">${userName}</div>
            <div class="cover-meta-date">${savedAt || new Date().toLocaleDateString()}</div>
          </div>
        </div>
        <div class="cover-right">
          <svg class="cover-chart-svg" viewBox="0 0 220 220">
            <circle cx="110" cy="110" r="90" fill="none" stroke="#1C1E21" stroke-width="18"/>
            <circle cx="110" cy="110" r="90" fill="none" stroke="url(#cg)" stroke-width="18" stroke-dasharray="377" stroke-dashoffset="94" stroke-linecap="round" transform="rotate(-90 110 110)"/>
            <circle cx="110" cy="110" r="60" fill="none" stroke="#1E2940" stroke-width="12"/>
            <circle cx="110" cy="110" r="60" fill="none" stroke="#7C3AED" stroke-width="12" stroke-dasharray="251" stroke-dashoffset="100" stroke-linecap="round" opacity="0.5" transform="rotate(-90 110 110)"/>
            <text x="110" y="105" text-anchor="middle" fill="#fff" font-size="22" font-weight="800" font-family="Arial">ADS</text>
            <text x="110" y="128" text-anchor="middle" fill="#64748B" font-size="11" font-family="Arial">ANALYSIS</text>
            <defs><linearGradient id="cg" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="#1877F2"/><stop offset="100%" stop-color="#38BDF8"/></linearGradient></defs>
          </svg>
        </div>
      </div>
      <div class="slide-num">1 / ${totalSlides}</div>
    </div>`;

    // Budget Summary slide
    if (budget) {
      const si = slideIdx++;
      const statCards = budget.stats.map(s => `
        <div class="bstat-card">
          <div class="bstat-value" style="color:${s.color || "#fff"}">${s.value}</div>
          <div class="bstat-label">${s.label}</div>
          <div class="bstat-sub">${s.sub}</div>
        </div>`).join("");
      slidesHTML += `
      <div class="slide" id="slide-${si}">
        <svg class="bg-orb orb3" viewBox="0 0 500 500"><circle cx="250" cy="250" r="250" fill="url(#g3b)"/><defs><radialGradient id="g3b"><stop offset="0%" stop-color="#1877F2" stop-opacity="0.1"/><stop offset="100%" stop-color="#1877F2" stop-opacity="0"/></radialGradient></defs></svg>
        <div class="slide-header">
          <div class="slide-header-left">
            <div class="slide-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg></div>
            <div>
              <div class="slide-eyebrow">Budget Breakdown</div>
              <h2 class="slide-title">Where The Money Went</h2>
            </div>
          </div>
          <div class="slide-num-header">${si + 1} / ${totalSlides}</div>
        </div>
        <div class="slide-rule"></div>
        <div class="slide-body" style="justify-content:flex-start;padding-top:12px">
          <div class="bstat-grid">${statCards}</div>
          ${budget.roas ? `
          <div class="roas-bar">
            <div class="roas-left">
              <div class="roas-label">ROAS</div>
              <div class="roas-value" style="color:${budget.verdictColor}">${budget.roas}x</div>
            </div>
            <div class="roas-divider"></div>
            <div class="roas-verdict" style="color:${budget.verdictColor}">${budget.verdict}</div>
            <div class="roas-track"><div class="roas-fill" style="width:${Math.min(parseFloat(budget.roas)/5*100,100)}%;background:${budget.verdictColor}"></div></div>
          </div>` : ""}
        </div>
        <div class="slide-footer-bar"><span>${userName}</span></div>
      </div>`;
    }

    // Section slides
    sections.forEach((s) => {
      const si = slideIdx++;
      const content = renderSlideContent(s.title, s.lines);
      const icon = getIcon(s.title);
      slidesHTML += `
      <div class="slide" id="slide-${si}">
        <svg class="bg-orb orb3" viewBox="0 0 500 500"><circle cx="250" cy="250" r="250" fill="url(#g3)"/><defs><radialGradient id="g3"><stop offset="0%" stop-color="#1877F2" stop-opacity="0.1"/><stop offset="100%" stop-color="#1877F2" stop-opacity="0"/></radialGradient></defs></svg>
        <div class="slide-header">
          <div class="slide-header-left">
            <div class="slide-icon">${icon}</div>
            <div>
              <div class="slide-eyebrow">Analysis</div>
              <h2 class="slide-title">${s.title}</h2>
            </div>
          </div>
          <div class="slide-num-header">${si + 1} / ${totalSlides}</div>
        </div>
        <div class="slide-rule"></div>
        <div class="slide-body">${content}</div>
        <div class="slide-footer-bar"><span>${userName}</span></div>
      </div>`;
    });

    // Closing slide
    const closingIdx = slideIdx++;
    slidesHTML += `
    <div class="slide" id="slide-${closingIdx}">
      <svg class="bg-orb orb1" viewBox="0 0 400 400"><circle cx="200" cy="200" r="200" fill="url(#g4)"/><defs><radialGradient id="g4"><stop offset="0%" stop-color="#1877F2" stop-opacity="0.3"/><stop offset="100%" stop-color="#1877F2" stop-opacity="0"/></radialGradient></defs></svg>
      <svg class="bg-orb orb2" viewBox="0 0 300 300"><circle cx="150" cy="150" r="150" fill="url(#g5)"/><defs><radialGradient id="g5"><stop offset="0%" stop-color="#22c55e" stop-opacity="0.15"/><stop offset="100%" stop-color="#22c55e" stop-opacity="0"/></radialGradient></defs></svg>
      <div class="closing-layout">
        <div class="closing-label">CONCLUSION</div>
        <div class="closing-l1">Scale What Works.</div>
        <div class="closing-l2">Pause What Doesn't.</div>
        <div class="closing-divider"></div>
        <div class="closing-name">${userName}</div>
        <div class="closing-date">${savedAt || ""}</div>
      </div>
      <div class="slide-num">${closingIdx + 1} / ${totalSlides}</div>
    </div>`;

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Ad Analysis — ${userName}</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
*{box-sizing:border-box;margin:0;padding:0}
body{background:#060D18;font-family:'Inter',Arial,sans-serif;overflow:hidden;width:100vw;height:100vh}
.slide{display:none;width:100vw;height:100vh;background:#060D18;flex-direction:column;position:absolute;top:0;left:0;animation:fadeIn 0.35s ease}
.slide.active{display:flex}
@keyframes fadeIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}

/* BG decorations */
.bg-orb{position:absolute;pointer-events:none}
.orb1{width:600px;height:600px;top:-100px;right:-100px;opacity:0.8}
.orb2{width:400px;height:400px;bottom:-80px;left:-80px;opacity:0.6}
.orb3{width:700px;height:700px;top:-200px;right:-200px;opacity:1}
.bg-grid{position:absolute;width:100%;height:100%;top:0;left:0;opacity:0.4;pointer-events:none}

/* Cover */
.cover-layout{flex:1;display:flex;align-items:center;padding:0 80px;gap:60px;position:relative;z-index:1}
.cover-left{flex:1}
.cover-tag{display:inline-block;font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#1877F2;background:rgba(24,119,242,0.12);border:1px solid rgba(24,119,242,0.3);padding:6px 14px;border-radius:20px;margin-bottom:28px}
.cover-h1{font-size:64px;font-weight:900;color:#fff;line-height:1.0;margin-bottom:32px}
.cover-h1-accent{background:linear-gradient(90deg,#1877F2,#38BDF8);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
.cover-divider{width:64px;height:3px;background:linear-gradient(90deg,#1877F2,#38BDF8);border-radius:2px;margin-bottom:28px}
.cover-meta-name{font-size:18px;font-weight:700;color:#fff;margin-bottom:4px}
.cover-meta-date{font-size:13px;color:#475569}
.cover-right{flex:0 0 240px;display:flex;align-items:center;justify-content:center}
.cover-chart-svg{width:220px;height:220px;filter:drop-shadow(0 0 32px rgba(24,119,242,0.35))}

/* Slide header */
.slide-header{display:flex;align-items:center;justify-content:space-between;padding:28px 60px 0;flex-shrink:0;position:relative;z-index:1}
.slide-header-left{display:flex;align-items:center;gap:16px}
.slide-icon{width:44px;height:44px;background:rgba(24,119,242,0.15);border:1px solid rgba(24,119,242,0.3);border-radius:12px;display:flex;align-items:center;justify-content:center;color:#1877F2;flex-shrink:0}
.slide-icon svg{width:22px;height:22px}
.slide-eyebrow{font-size:10px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#475569;margin-bottom:3px}
.slide-title{font-size:24px;font-weight:800;color:#fff}
.slide-num-header{font-size:12px;color:#64748B;font-weight:600}
.slide-rule{height:1px;background:linear-gradient(90deg,#1877F2,transparent);margin:16px 60px;flex-shrink:0}
.slide-body{flex:1;padding:0 60px 0;overflow:hidden;display:flex;flex-direction:column;justify-content:center;position:relative;z-index:1}
.slide-footer-bar{padding:14px 60px;font-size:11px;color:#64748B;font-weight:500;flex-shrink:0;border-top:1px solid #0F1E2E}
.slide-num{position:absolute;bottom:18px;right:60px;font-size:12px;color:#64748B;font-weight:600;z-index:1}

/* Metric cards */
.cards-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.metric-card{display:flex;align-items:center;gap:12px;padding:12px 16px;border-radius:10px;border:1px solid rgba(255,255,255,0.04)}
.metric-dot{font-size:10px;flex-shrink:0}
.metric-text{font-size:14px;color:#CBD5E1;line-height:1.4}
.metric-text strong{color:#fff}
.dot-g{color:#22c55e}.dot-y{color:#eab308}.dot-r{color:#ef4444}

/* Verdict cards */
.verdict-list{display:flex;flex-direction:column;gap:10px}
.verdict-card{display:flex;align-items:center;justify-content:space-between;padding:14px 20px;border-radius:12px;border:1px solid rgba(255,255,255,0.04)}
.verdict-name{font-size:15px;color:#E4E6EB;font-weight:600}
.badge{font-size:11px;font-weight:800;letter-spacing:0.1em;padding:4px 12px;border-radius:20px;text-transform:uppercase;flex-shrink:0}

/* Funnel */
.funnel-row{display:flex;align-items:center;gap:8px;margin-bottom:24px;background:rgba(24,119,242,0.06);border:1px solid rgba(24,119,242,0.15);border-radius:14px;padding:20px 24px}
.funnel-step{flex:1;text-align:center}
.funnel-val{font-size:22px;font-weight:800;color:#fff;margin-bottom:4px}
.funnel-label{font-size:10px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#475569}
.funnel-arrow{font-size:28px;color:#1877F2;font-weight:300;flex-shrink:0}

/* Callout */
.callout-block{display:flex;flex-direction:column;gap:10px}
.callout-line{font-size:15px;color:#CBD5E1;line-height:1.65;padding:10px 16px;background:rgba(255,255,255,0.025);border-radius:10px;border-left:3px solid #1E3A5F}
.callout-line strong{color:#fff}
.plain-line{font-size:14px;color:#64748B;line-height:1.6;padding:4px 0}

/* Closing */
.closing-layout{flex:1;display:flex;flex-direction:column;justify-content:center;padding:0 80px;position:relative;z-index:1}
.closing-label{font-size:11px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:#1877F2;margin-bottom:20px}
.closing-l1{font-size:62px;font-weight:900;color:#fff;line-height:1.05;margin-bottom:4px}
.closing-l2{font-size:62px;font-weight:900;background:linear-gradient(90deg,#1877F2,#38BDF8);-webkit-background-clip:text;-webkit-text-fill-color:transparent;line-height:1.05;margin-bottom:36px}
.closing-divider{width:64px;height:3px;background:linear-gradient(90deg,#1877F2,#38BDF8);border-radius:2px;margin-bottom:24px}
.closing-name{font-size:16px;font-weight:700;color:#fff;margin-bottom:4px}
.closing-date{font-size:12px;color:#475569}

/* Budget stats */
.bstat-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:20px}
.bstat-card{background:#FFFFFF;border:1px solid #E4E6EB;border-radius:14px;padding:20px 18px}
.bstat-value{font-size:28px;font-weight:900;margin-bottom:6px;line-height:1}
.bstat-label{font-size:12px;font-weight:700;color:#64748B;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:3px}
.bstat-sub{font-size:11px;color:#475569}
.roas-bar{display:flex;align-items:center;gap:20px;background:#FFFFFF;border:1px solid #E4E6EB;border-radius:14px;padding:18px 24px}
.roas-left{flex-shrink:0}
.roas-label{font-size:10px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#475569;margin-bottom:4px}
.roas-value{font-size:36px;font-weight:900;line-height:1}
.roas-divider{width:1px;height:40px;background:#E4E6EB;flex-shrink:0}
.roas-verdict{font-size:18px;font-weight:800;flex-shrink:0}
.roas-track{flex:1;height:8px;background:#E4E6EB;border-radius:4px;overflow:hidden}
.roas-fill{height:100%;border-radius:4px;transition:width 0.6s ease}

/* Nav */
.nav{position:fixed;bottom:24px;left:50%;transform:translateX(-50%);display:flex;gap:10px;z-index:100;background:rgba(255,255,255,0.9);backdrop-filter:blur(12px);padding:8px;border-radius:16px;border:1px solid #E4E6EB}
.nav button{background:transparent;border:none;color:#475569;font-size:16px;width:40px;height:40px;border-radius:10px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all 0.15s;font-weight:600}
.nav button:hover{background:#E4E6EB;color:#1C1E21}
.progress-bar{position:fixed;top:0;left:0;height:3px;background:linear-gradient(90deg,#1877F2,#38BDF8);transition:width 0.4s cubic-bezier(.4,0,.2,1);z-index:200}
</style>
</head>
<body>
<div id="prog" class="progress-bar"></div>
<div style="position:relative;width:100vw;height:100vh">${slidesHTML}</div>
<div class="nav">
  <button onclick="go(-1)" title="Previous">&#8592;</button>
  <button onclick="go(1)" title="Next">&#8594;</button>
</div>
<script>
let cur=0;const total=${totalSlides};
function show(n){
  document.querySelectorAll('.slide').forEach(s=>s.classList.remove('active'));
  cur=Math.max(0,Math.min(n,total-1));
  document.getElementById('slide-'+cur).classList.add('active');
  document.getElementById('prog').style.width=((cur+1)/total*100)+'%';
}
function go(d){show(cur+d);}
document.addEventListener('keydown',e=>{
  if(e.key==='ArrowRight'||e.key==='ArrowDown')go(1);
  if(e.key==='ArrowLeft'||e.key==='ArrowUp')go(-1);
});
show(0);
<\/script>
</body>
</html>`;

    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `analysis-deck-${new Date().toISOString().slice(0, 10)}.html`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async function downloadPDF() {
    if (!output || !reportRef.current) return;
    const html2pdf = (await import("html2pdf.js")).default;
    html2pdf()
      .set({
        margin: [12, 12, 12, 12],
        filename: `hinilas-analysis-${new Date().toISOString().slice(0, 10)}.pdf`,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      })
      .from(reportRef.current)
      .save();
  }

  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const MAX = 1280;
        const scale = img.width > MAX ? MAX / img.width : 1;
        const canvas = document.createElement("canvas");
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        setScreenshot(canvas.toDataURL("image/jpeg", 0.8));
      };
      img.src = ev.target?.result as string;
    };
    reader.readAsDataURL(file);
  }

  function handleCsvUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => setCsvText(ev.target?.result as string);
    reader.readAsText(file);
  }

  async function analyze() {
    if (!setup) return;
    if (mode === "basic" && !screenshot) return;
    if (mode === "advanced" && !csvText) return;

    setLoading(true);
    const userCtx = buildUserContext(setup);

    try {
      if (mode === "basic") {
        // Deduct 1 credit for basic analysis
        if (credits < 1) {
          setOutputBasic("Not enough credits. Basic Analysis costs 1 credit.");
          setLoading(false);
          return;
        }
        const deductBasic = await fetch("/api/credits/use", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ amount: 1, description: "Basic Analysis" }),
        });
        if (!deductBasic.ok) {
          setOutputBasic("Not enough credits. Basic Analysis costs 1 credit.");
          setLoading(false);
          return;
        }
        await refreshCredits();

        const hasProfit = productPrice || productCost || amountSpent || numSales;
        const profitInfo = hasProfit
          ? `\nProduct Selling Price: P${productPrice || "not provided"}\nProduct Cost: P${productCost || "not provided"}\nAmount Spent on Ads: P${amountSpent || "not provided"}\nNumber of Sales / Conversions: ${numSales || "not provided"}`
          : "";
        const prompt = MODULE_PROMPTS.analyze(userCtx, profitInfo);
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt, systemPrompt: HILAS_KNOWLEDGE, images: [screenshot], module: "analyze" }),
        });
        const d = await res.json();
        const result = d.error ? `Error: ${d.error}` : d.content;
        setOutputBasic(result);
        const ts = new Date().toLocaleString("en-PH", { timeZone: "Asia/Manila" });
        setSavedAtBasic(ts);
        setAnalyzeOutput({ ...analyzeOutput, basic: { output: result, savedAt: ts } });
      } else {
        // Deduct 2 credits for advanced analysis
        if (credits < 2) {
          setOutputAdvanced("Not enough credits. Advanced Analysis costs 2 credits.");
          setLoading(false);
          return;
        }
        const deductRes = await fetch("/api/credits/use", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ amount: 2, description: "Advanced Analysis" }),
        });
        if (!deductRes.ok) {
          setOutputAdvanced("Not enough credits. Advanced Analysis costs 2 credits.");
          setLoading(false);
          return;
        }
        await refreshCredits();

        const hasExtra = sellingPrice || cogs || shippingFee || rtsPercent;
        const extraData = hasExtra
          ? `Selling Price: P${sellingPrice || "not provided"}\nCOGS: P${cogs || "not provided"}\nShipping Fee: P${shippingFee || "not provided"}\nEstimated RTS %: ${rtsPercent || "not provided"}%`
          : "";
        const prompt = MODULE_PROMPTS.analyzeAdvanced(userCtx, extraData) + `\n\n# META ADS EXPORT DATA\n${csvText}`;
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt, systemPrompt: HILAS_KNOWLEDGE, module: "analyze" }),
        });
        const d = await res.json();
        const result = d.error ? `Error: ${d.error}` : d.content;
        setOutputAdvanced(result);
        const ts = new Date().toLocaleString("en-PH", { timeZone: "Asia/Manila" });
        setSavedAtAdvanced(ts);
        setAnalyzeOutput({ ...analyzeOutput, advanced: { output: result, savedAt: ts } });
      }
    } catch {
      if (mode === "basic") setOutputBasic("Something went wrong. Try again.");
      else setOutputAdvanced("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  }

  if (!setup) {
    return (
      <>
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-gray-400 mb-4">Set up your business profile first.</p>
            <button onClick={() => router.push("/")} className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-lg text-sm font-medium">Go to Setup</button>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <main className="flex-1 overflow-y-auto pt-14 md:pt-12">
        <div className="max-w-3xl mx-auto px-6 py-10">

          {/* Header */}
          <div className="mb-8">
            <div className="inline-flex items-center gap-2 bg-yellow-950 border border-yellow-800 rounded-full px-3 py-1 mb-4">
              <span className="text-yellow-300 text-xs font-medium">📊 Audit Department</span>
            </div>
            <h1 className="text-2xl font-bold text-[#1c1e21] mb-2">Audit Your Ad Results</h1>
            <p className="text-sm" style={{ color: "#65676b" }}>Choose your analysis type below.</p>
          </div>

          {isLite && <TierLock requiredTier="Flex" featureName="Audit Department" />}
          {!isLite && (
            <>
          {/* Mode selector */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <button
              onClick={() => setMode("basic")}
              className="rounded-xl border p-5 text-left transition-all"
              style={{
                background: mode === "basic" ? "#FFFFFF" : "#F0F2F5",
                borderColor: mode === "basic" ? "#1877F2" : "#1F2937",
                boxShadow: mode === "basic" ? "0 0 16px #1877F230" : "none",
              }}
            >
              <div className="text-2xl mb-2">📸</div>
              <p className="text-[#1c1e21] font-bold text-sm mb-1">Basic Analysis</p>
              <p className="text-gray-500 text-xs">Messaging Ads — upload a screenshot</p>
            </button>
            <button
              onClick={() => setMode("advanced")}
              className="rounded-xl border p-5 text-left transition-all"
              style={{
                background: mode === "advanced" ? "#FFFFFF" : "#F0F2F5",
                borderColor: mode === "advanced" ? "#D97706" : "#1F2937",
                boxShadow: mode === "advanced" ? "0 0 16px #D9770630" : "none",
              }}
            >
              <div className="text-2xl mb-2">📄</div>
              <p className="text-[#1c1e21] font-bold text-sm mb-1">Advanced Analysis</p>
              <p className="text-gray-500 text-xs">Purchase Ads — upload exported CSV</p>
            </button>
          </div>

          {/* BASIC MODE */}
          {mode === "basic" && (
            <>
              {/* Video guide */}
              <div className="rounded-xl border border-slate-200 overflow-hidden mb-6" style={{ background: "#FFFFFF" }}>
                <div className="px-4 py-3 flex items-center gap-2 border-b border-slate-200">
                  <span className="text-red-400 text-sm">▶</span>
                  <p className="text-[#1c1e21] text-sm font-semibold">Watch before analyzing</p>
                  <span className="text-gray-600 text-xs ml-auto">Video guide</span>
                </div>
                {videos.analyze_basic.unlocked ? (
                  <>
                    <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
                      {/* @ts-expect-error webkitallowfullscreen/mozallowfullscreen required by Loom */}
                      <iframe src="https://www.loom.com/embed/33bbe4f3b6dc41de9d2487eace51e9e5" frameBorder="0" webkitallowfullscreen="true" mozallowfullscreen="true" allowFullScreen className="absolute inset-0 w-full h-full" style={{ border: "none" }} />
                    </div>
                    <div className="px-4 py-2 flex items-center justify-between border-t border-slate-200" style={{ background: "#FFFFFF" }}>
                      {videos.analyze_basic.expiresAt && (
                        <p className="text-xs" style={{ color: "#65676b" }}>Access expires {new Date(videos.analyze_basic.expiresAt).toLocaleString()}</p>
                      )}
                      <a href="https://www.loom.com/share/33bbe4f3b6dc41de9d2487eace51e9e5" target="_blank" rel="noopener noreferrer" className="text-xs font-semibold ml-auto" style={{ color: "#1877F2" }}>Watch on Loom ↗</a>
                    </div>
                  </>
                ) : (
                  <div>
                    <div className="relative w-full cursor-pointer" style={{ paddingBottom: "56.25%" }} onClick={() => unlockVideo("analyze_basic")}>
                      <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, #1877F218 0%, #1877F238 100%)", borderBottom: "3px solid #1877F2" }} />
                      <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ background: "rgba(0,0,0,0.52)" }}>
                        <div className="w-14 h-14 rounded-full flex items-center justify-center mb-2" style={{ background: "rgba(255,255,255,0.15)", border: "2px solid rgba(255,255,255,0.5)", backdropFilter: "blur(4px)" }}>
                          <svg width="22" height="22" viewBox="0 0 24 24" fill="white" stroke="none"><polygon points="6 3 20 12 6 21 6 3"/></svg>
                        </div>
                        <p className="text-white text-sm font-bold">Watch Tutorial</p>
                        <p className="text-white/70 text-xs mt-0.5">1 credit · 24hr access</p>
                      </div>
                    </div>
                    <div className="px-4 py-3 flex items-center justify-between gap-3" style={{ background: "#FFFFFF", borderTop: "1px solid #E4E6EB" }}>
                      <div>
                        <p className="text-sm font-semibold" style={{ color: "#1c1e21" }}>Basic Analysis Tutorial</p>
                        {videoNoCredits && unlockingVideo === null
                          ? <p className="text-xs" style={{ color: "#fa383e" }}>No credits left. Top up to watch.</p>
                          : <p className="text-xs" style={{ color: "#65676b" }}>Unlock once, watch for 24 hours</p>
                        }
                      </div>
                      <button
                        onClick={() => unlockVideo("analyze_basic")}
                        disabled={unlockingVideo === "analyze_basic"}
                        className="shrink-0 px-4 py-2 rounded-xl text-sm font-bold text-white transition-opacity disabled:opacity-50"
                        style={{ background: "#1877F2" }}
                      >
                        {unlockingVideo === "analyze_basic" ? "Unlocking..." : "Unlock — 1 cr"}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Column instructions */}
              <div className="rounded-xl border px-5 py-4 mb-6" style={{ background: "#e7f3ff", borderColor: "#c3d9fd" }}>
                <p className="text-sm font-semibold mb-2" style={{ color: "#1877F2" }}>Before you screenshot — arrange your columns</p>
                <p className="text-xs mb-3" style={{ color: "#65676b" }}>Set your Ads Manager columns in this exact order:</p>
                <ol className="space-y-1 mb-3">
                  {BASIC_COLUMNS.map((col, i) => (
                    <li key={i} className="flex items-center gap-2 text-xs" style={{ color: "#1c1e21" }}>
                      <span className="w-4 h-4 rounded-full flex items-center justify-center shrink-0 text-xs font-bold" style={{ background: "#1877F2", color: "#ffffff" }}>{i + 1}</span>
                      {col}
                    </li>
                  ))}
                </ol>
                <p className="text-xs" style={{ color: "#65676b" }}>Take a screenshot of that view, then upload below.</p>
              </div>

              {/* Upload */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-300 mb-2">Ads Manager Screenshot</label>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleImageUpload} />
                {screenshot ? (
                  <>
                    <div className="rounded-xl overflow-hidden border border-slate-200 mb-2">
                      <img src={screenshot} alt="screenshot" className="w-full object-contain max-h-72" />
                    </div>
                    <div className="flex gap-3 mt-2">
                      <button onClick={() => fileRef.current?.click()} className="text-xs text-blue-400 hover:text-blue-300">Replace</button>
                      <button onClick={() => setScreenshot(null)} className="text-xs text-red-400 hover:text-red-300">Remove</button>
                    </div>
                  </>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => fileRef.current?.click()} className="flex flex-col items-center gap-2 bg-white border border-dashed border-slate-300 rounded-xl p-5 text-center hover:border-blue-600 transition-colors">
                      <span className="text-2xl">🖼</span>
                      <p className="text-sm font-medium" style={{ color: "#1c1e21" }}>Upload Screenshot</p>
                      <p className="text-xs" style={{ color: "#65676b" }}>From your files</p>
                    </button>
                    <button onClick={() => cameraRef.current?.click()} className="flex flex-col items-center gap-2 bg-white border border-dashed border-slate-300 rounded-xl p-5 text-center hover:border-blue-600 transition-colors">
                      <span className="text-2xl">📷</span>
                      <p className="text-sm font-medium" style={{ color: "#1c1e21" }}>Take a Photo</p>
                      <p className="text-xs" style={{ color: "#65676b" }}>Use your camera</p>
                    </button>
                  </div>
                )}
              </div>

              {/* Basic profit fields */}
              <div className="border border-slate-200 rounded-xl p-5 mb-6" style={{ background: "#FFFFFF" }}>
                <p className="text-xs font-medium uppercase tracking-wider mb-1" style={{ color: "#65676b" }}>Optional — Profit & ROAS Calculator</p>
                <p className="text-xs mb-4" style={{ color: "#65676b" }}>Add these numbers to get profit per sale, ROAS, and break-even cost per message.</p>
                <div className="grid grid-cols-2 gap-4">
                  <PInput label="Selling Price (PHP)" value={productPrice} onChange={setProductPrice} placeholder="e.g. 499" />
                  <PInput label="Product Cost (PHP)" value={productCost} onChange={setProductCost} placeholder="e.g. 180" />
                  <PInput label="Amount Spent on Ads (PHP)" value={amountSpent} onChange={setAmountSpent} placeholder="e.g. 800" />
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">Number of Sales</label>
                    <input type="number" value={numSales} onChange={e => setNumSales(e.target.value)} placeholder="e.g. 5"
                      className="w-full bg-white border border-slate-200 rounded-lg py-2.5 px-3 text-[#1c1e21] placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ADVANCED MODE */}
          {mode === "advanced" && (
            <>
              {/* Video guide */}
              <div className="rounded-xl border border-slate-200 overflow-hidden mb-6" style={{ background: "#FFFFFF" }}>
                <div className="px-4 py-3 flex items-center gap-2 border-b border-slate-200">
                  <span className="text-red-400 text-sm">▶</span>
                  <p className="text-[#1c1e21] text-sm font-semibold">Watch before analyzing</p>
                  <span className="text-gray-600 text-xs ml-auto">Video guide</span>
                </div>
                {videos.analyze_advanced.unlocked ? (
                  <>
                    <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
                      {/* @ts-expect-error webkitallowfullscreen/mozallowfullscreen required by Loom */}
                      <iframe src="https://www.loom.com/embed/633b09b4378d4f4e863bead19f51b1a3" frameBorder="0" webkitallowfullscreen="true" mozallowfullscreen="true" allowFullScreen className="absolute inset-0 w-full h-full" style={{ border: "none" }} />
                    </div>
                    <div className="px-4 py-2 flex items-center justify-between border-t border-slate-200" style={{ background: "#FFFFFF" }}>
                      {videos.analyze_advanced.expiresAt && (
                        <p className="text-xs" style={{ color: "#65676b" }}>Access expires {new Date(videos.analyze_advanced.expiresAt).toLocaleString()}</p>
                      )}
                      <a href="https://www.loom.com/share/633b09b4378d4f4e863bead19f51b1a3" target="_blank" rel="noopener noreferrer" className="text-xs font-semibold ml-auto" style={{ color: "#D97706" }}>Watch on Loom ↗</a>
                    </div>
                  </>
                ) : (
                  <div>
                    <div className="relative w-full cursor-pointer" style={{ paddingBottom: "56.25%" }} onClick={() => unlockVideo("analyze_advanced")}>
                      <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, #D9770618 0%, #D9770638 100%)", borderBottom: "3px solid #D97706" }} />
                      <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ background: "rgba(0,0,0,0.52)" }}>
                        <div className="w-14 h-14 rounded-full flex items-center justify-center mb-2" style={{ background: "rgba(255,255,255,0.15)", border: "2px solid rgba(255,255,255,0.5)", backdropFilter: "blur(4px)" }}>
                          <svg width="22" height="22" viewBox="0 0 24 24" fill="white" stroke="none"><polygon points="6 3 20 12 6 21 6 3"/></svg>
                        </div>
                        <p className="text-white text-sm font-bold">Watch Tutorial</p>
                        <p className="text-white/70 text-xs mt-0.5">1 credit · 24hr access</p>
                      </div>
                    </div>
                    <div className="px-4 py-3 flex items-center justify-between gap-3" style={{ background: "#FFFFFF", borderTop: "1px solid #E4E6EB" }}>
                      <div>
                        <p className="text-sm font-semibold" style={{ color: "#1c1e21" }}>Advanced Analysis Tutorial</p>
                        {videoNoCredits && unlockingVideo === null
                          ? <p className="text-xs" style={{ color: "#fa383e" }}>No credits left. Top up to watch.</p>
                          : <p className="text-xs" style={{ color: "#65676b" }}>Unlock once, watch for 24 hours</p>
                        }
                      </div>
                      <button
                        onClick={() => unlockVideo("analyze_advanced")}
                        disabled={unlockingVideo === "analyze_advanced"}
                        className="shrink-0 px-4 py-2 rounded-xl text-sm font-bold transition-opacity disabled:opacity-50"
                        style={{ background: "#D97706", color: "#000" }}
                      >
                        {unlockingVideo === "analyze_advanced" ? "Unlocking..." : "Unlock — 1 cr"}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Column instructions */}
              <div className="rounded-xl border px-5 py-4 mb-6" style={{ background: "#FFFBEB", borderColor: "#FDE68A" }}>
                <p className="text-sm font-semibold mb-2" style={{ color: "#D97706" }}>Before you export — include these columns</p>
                <p className="text-xs mb-3" style={{ color: "#65676b" }}>In Ads Manager, customize columns to include these, then export as CSV:</p>
                <ol className="space-y-1 mb-3">
                  {ADVANCED_COLUMNS.map((col, i) => (
                    <li key={i} className="flex items-center gap-2 text-xs" style={{ color: "#1c1e21" }}>
                      <span className="w-4 h-4 rounded-full flex items-center justify-center shrink-0 text-xs font-bold" style={{ background: "#D97706", color: "#ffffff" }}>{i + 1}</span>
                      {col}
                    </li>
                  ))}
                </ol>
                <p className="text-xs" style={{ color: "#65676b" }}>Ads Manager → Export → Export Table Data (CSV)</p>
              </div>

              {/* CSV Upload */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-300 mb-2">Meta Ads Export File</label>
                <input ref={csvRef} type="file" accept=".csv" className="hidden" onChange={handleCsvUpload} />
                {csvText ? (
                  <div className="rounded-xl border border-slate-200 px-4 py-3 flex items-center justify-between" style={{ background: "#FFFFFF" }}>
                    <div className="flex items-center gap-3">
                      <span className="text-xl">📄</span>
                      <div>
                        <p className="text-[#1c1e21] text-sm font-medium">{csvFileName}</p>
                        <p className="text-gray-500 text-xs">File loaded — ready to analyze</p>
                      </div>
                    </div>
                    <button onClick={() => { setCsvText(null); setCsvFileName(""); }} className="text-xs text-red-400 hover:text-red-300">Remove</button>
                  </div>
                ) : (
                  <button onClick={() => csvRef.current?.click()} className="w-full flex flex-col items-center gap-2 bg-white border border-dashed border-slate-300 rounded-xl p-8 text-center hover:border-orange-600 transition-colors">
                    <span className="text-3xl">📄</span>
                    <p className="text-sm font-medium" style={{ color: "#1c1e21" }}>Upload CSV Export</p>
                    <p className="text-xs" style={{ color: "#65676b" }}>CSV only — Export → Export Table Data (CSV)</p>
                  </button>
                )}
              </div>

              {/* Advanced profit fields */}
              <div className="border border-slate-200 rounded-xl p-5 mb-6" style={{ background: "#FFFFFF" }}>
                <p className="text-xs font-medium uppercase tracking-wider mb-1" style={{ color: "#65676b" }}>Optional — COD Profit Calculator</p>
                <p className="text-xs mb-4" style={{ color: "#65676b" }}>Include COGS, shipping, and RTS rate for a true net profit calculation.</p>
                <div className="grid grid-cols-2 gap-4">
                  <PInput label="Selling Price (PHP)" value={sellingPrice} onChange={setSellingPrice} placeholder="e.g. 599" />
                  <PInput label="COGS — Cost of Goods (PHP)" value={cogs} onChange={setCogs} placeholder="e.g. 150" />
                  <PInput label="Shipping Fee (PHP)" value={shippingFee} onChange={setShippingFee} placeholder="e.g. 80" />
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">Estimated RTS % (Return to Sender)</label>
                    <div className="relative">
                      <input type="number" value={rtsPercent} onChange={e => setRtsPercent(e.target.value)} placeholder="e.g. 20"
                        className="w-full bg-white border border-slate-200 rounded-lg py-2.5 pl-3 pr-7 text-[#1c1e21] placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">%</span>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Analyze button */}
          {mode && (
            <button
              onClick={analyze}
              disabled={loading || (mode === "basic" ? !screenshot : !csvText)}
              className="w-full text-white py-3 rounded-lg text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-40 mb-6"
              style={{ background: mode === "advanced" ? "#D97706" : "#1877F2", color: mode === "advanced" ? "#000" : "#fff", animation: mode === "advanced" ? "btnGlowOrange 2s ease-in-out infinite alternate" : "btnGlowBlue 2s ease-in-out infinite alternate" }}
            >
              {loading ? "Analyzing..." : mode === "advanced" ? "Run Advanced Analysis — 2 credits" : "Analyze My Results — 1 credit"}
            </button>
          )}

          {/* Last saved indicator */}
          {savedAt && !loading && output && (
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs" style={{ color: "#65676b" }}>
                Last analysis: <span className="text-gray-500">{savedAt}</span> · <span className="text-gray-500 uppercase text-xs">{mode === "advanced" ? "Advanced" : "Basic"}</span>
              </p>
              <button
                onClick={() => {
                  if (mode === "advanced") { setOutputAdvanced(""); setSavedAtAdvanced(null); setAnalyzeOutput({ ...analyzeOutput, advanced: null }); }
                  else { setOutputBasic(""); setSavedAtBasic(null); setAnalyzeOutput({ ...analyzeOutput, basic: null }); }
                }}
                className="text-xs text-red-500 hover:text-red-400"
              >
                Clear
              </button>
            </div>
          )}

          {/* Output */}
          {(output || loading) && (
            <div className="relative">
              {output && !loading && (
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-500 uppercase tracking-wide font-semibold">Analysis Result</span>
                  <button
                    onClick={() => navigator.clipboard.writeText(output)}
                    className="text-xs px-3 py-1 rounded-lg border border-slate-200 hover:border-gray-500 text-[#8a8d91] hover:text-[#1c1e21] transition-colors"
                  >
                    Copy
                  </button>
                </div>
              )}
              <AIOutput content={output} loading={loading} loadingText="Analyzing your data..." />
            </div>
          )}

          {/* Report action buttons */}
          {output && !loading && (
            <div className="flex gap-3 mt-4">
              <button
                onClick={downloadHTMLDeck}
                className="flex-1 py-3 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
                style={{ background: "#1877F2", color: "#fff" }}
              >
                <span>🖥️</span> Get Report Presentation
              </button>
            </div>
          )}

            </>
          )}

        </div>
      </main>
    </>
  );
}
