"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import AIOutput from "@/components/AIOutput";
import { useApp, buildUserContext } from "@/lib/context";
import { MODULE_PROMPTS, HILAS_KNOWLEDGE } from "@/lib/knowledge";
import { createClient } from "@/lib/supabase/client";

const STORAGE_KEY = "hinilas_last_analysis";

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
  "Purchases",
  "Cost per Purchase",
  "Purchase ROAS",
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
          className="w-full bg-gray-800 border border-gray-700 rounded-lg py-2.5 pl-7 pr-3 text-white placeholder-gray-600 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
    </div>
  );
}

export default function AnalyzePage() {
  const { setup } = useApp();
  const router = useRouter();
  const [mode, setMode] = useState<Mode | null>(null);

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
  const [showReport, setShowReport] = useState(false);
  const [userName, setUserName] = useState("User");
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const csvRef = useRef<HTMLInputElement>(null);
  const reportRef = useRef<HTMLDivElement>(null);

  // Load user name
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserName(user.user_metadata?.full_name || user.email || "User");
    });
  }, []);

  // Restore last analyses on load
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.basic?.output) { setOutputBasic(parsed.basic.output); setSavedAtBasic(parsed.basic.savedAt); }
      if (parsed.advanced?.output) { setOutputAdvanced(parsed.advanced.output); setSavedAtAdvanced(parsed.advanced.savedAt); }
      // legacy single-result migration
      if (parsed.output && parsed.mode) {
        if (parsed.mode === "basic") { setOutputBasic(parsed.output); setSavedAtBasic(parsed.savedAt); }
        else { setOutputAdvanced(parsed.output); setSavedAtAdvanced(parsed.savedAt); }
      }
    }
  }, []);

  const output = mode === "advanced" ? outputAdvanced : outputBasic;
  const savedAt = mode === "advanced" ? savedAtAdvanced : savedAtBasic;

  function downloadHTMLDeck() {
    if (!output) return;

    // Parse into sections
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

    function renderLine(line: string): string {
      return line
        .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
        .replace(/🟢/g, '<span style="color:#22c55e">●</span>')
        .replace(/🟡/g, '<span style="color:#eab308">●</span>')
        .replace(/🔴/g, '<span style="color:#ef4444">●</span>');
    }

    function sectionToSlide(title: string, lines: string[], idx: number, total: number): string {
      const bullets = lines.map(l => {
        const t = l.replace(/^[-*]\s+/, "");
        return `<div class="bullet"><span class="dot">—</span><span>${renderLine(t)}</span></div>`;
      }).join("");
      return `
        <div class="slide" id="slide-${idx}">
          <div class="slide-top-bar"></div>
          <div class="slide-inner">
            <div class="section-label">${title.toUpperCase()}</div>
            <div class="divider"></div>
            <div class="bullets">${bullets}</div>
          </div>
          <div class="slide-footer">
            <span>${userName}</span>
            <span>${idx + 1} / ${total}</span>
          </div>
        </div>`;
    }

    const totalSlides = sections.length + 2; // cover + sections + closing
    let slidesHTML = "";

    // Cover
    slidesHTML += `
      <div class="slide" id="slide-0">
        <div class="slide-top-bar"></div>
        <div class="slide-inner cover-inner">
          <div class="cover-title">Meta Ads Analysis Report</div>
          <div class="cover-sub">${mode === "advanced" ? "Advanced Analysis" : "Basic Analysis"}</div>
          <div class="cover-line"></div>
          <div class="cover-name">${userName}</div>
          <div class="cover-date">${savedAt || new Date().toLocaleDateString()}</div>
        </div>
        <div class="slide-footer"><span></span><span>1 / ${totalSlides}</span></div>
      </div>`;

    // Section slides
    sections.forEach((s, i) => {
      slidesHTML += sectionToSlide(s.title, s.lines, i + 1, totalSlides);
    });

    // Closing
    slidesHTML += `
      <div class="slide" id="slide-${totalSlides - 1}">
        <div class="slide-top-bar"></div>
        <div class="slide-inner cover-inner">
          <div class="closing-line1">Scale What Works.</div>
          <div class="closing-line2">Pause What Doesn't.</div>
          <div class="cover-line" style="margin-top:32px"></div>
          <div class="cover-date">${userName}</div>
        </div>
        <div class="slide-footer"><span></span><span>${totalSlides} / ${totalSlides}</span></div>
      </div>`;

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>Ad Analysis Report — ${userName}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #000; font-family: Arial, sans-serif; overflow: hidden; }
  .deck { width: 100vw; height: 100vh; position: relative; }
  .slide { display: none; width: 100vw; height: 100vh; background: #0F172A; flex-direction: column; position: absolute; top: 0; left: 0; }
  .slide.active { display: flex; }
  .slide-top-bar { height: 5px; background: #2B7EC9; flex-shrink: 0; }
  .slide-inner { flex: 1; padding: 52px 72px 24px; overflow: hidden; display: flex; flex-direction: column; justify-content: center; }
  .section-label { font-size: 13px; font-weight: 800; color: #2B7EC9; letter-spacing: 0.12em; text-transform: uppercase; margin-bottom: 14px; }
  .divider { height: 1px; background: #1E3A5F; margin-bottom: 24px; }
  .bullets { display: flex; flex-direction: column; gap: 12px; overflow: hidden; }
  .bullet { display: flex; gap: 14px; align-items: flex-start; font-size: 17px; color: #CBD5E1; line-height: 1.6; }
  .dot { color: #2B7EC9; font-weight: bold; flex-shrink: 0; margin-top: 1px; }
  .bullet strong { color: #fff; }
  .cover-inner { justify-content: center; }
  .cover-title { font-size: 48px; font-weight: 800; color: #fff; line-height: 1.1; margin-bottom: 16px; }
  .cover-sub { font-size: 20px; color: #2B7EC9; margin-bottom: 32px; }
  .cover-line { width: 80px; height: 3px; background: #2B7EC9; margin-bottom: 28px; }
  .cover-name { font-size: 18px; font-weight: 700; color: #fff; margin-bottom: 8px; }
  .cover-date { font-size: 13px; color: #64748B; }
  .closing-line1 { font-size: 52px; font-weight: 800; color: #fff; line-height: 1.1; margin-bottom: 8px; }
  .closing-line2 { font-size: 52px; font-weight: 800; color: #2B7EC9; line-height: 1.1; margin-bottom: 8px; }
  .slide-footer { display: flex; justify-content: space-between; align-items: center; padding: 14px 72px; border-top: 1px solid #1E293B; font-size: 11px; color: #475569; flex-shrink: 0; }
  .nav { position: fixed; bottom: 28px; left: 50%; transform: translateX(-50%); display: flex; gap: 12px; z-index: 100; }
  .nav button { background: #1E293B; border: 1px solid #334155; color: #94A3B8; font-size: 18px; width: 44px; height: 44px; border-radius: 10px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: background 0.15s; }
  .nav button:hover { background: #2B7EC9; color: #fff; border-color: #2B7EC9; }
  .progress { position: fixed; top: 0; left: 0; height: 5px; background: #2B7EC9; transition: width 0.3s; z-index: 200; }
</style>
</head>
<body>
<div id="progress" class="progress"></div>
<div class="deck">${slidesHTML}</div>
<div class="nav">
  <button onclick="go(-1)">&#8592;</button>
  <button onclick="go(1)">&#8594;</button>
</div>
<script>
  let cur = 0;
  const total = ${totalSlides};
  function show(n) {
    document.querySelectorAll('.slide').forEach(s => s.classList.remove('active'));
    cur = Math.max(0, Math.min(n, total - 1));
    document.getElementById('slide-' + cur).classList.add('active');
    document.getElementById('progress').style.width = ((cur + 1) / total * 100) + '%';
  }
  function go(dir) { show(cur + dir); }
  document.addEventListener('keydown', e => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') go(1);
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') go(-1);
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
        const hasProfit = productPrice || productCost || amountSpent || numSales;
        const profitInfo = hasProfit
          ? `\nProduct Selling Price: P${productPrice || "not provided"}\nProduct Cost: P${productCost || "not provided"}\nAmount Spent on Ads: P${amountSpent || "not provided"}\nNumber of Sales / Conversions: ${numSales || "not provided"}`
          : "";
        const prompt = MODULE_PROMPTS.analyze(userCtx, profitInfo);
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt, systemPrompt: HILAS_KNOWLEDGE, images: [screenshot] }),
        });
        const d = await res.json();
        const result = d.error ? `Error: ${d.error}` : d.content;
        setOutputBasic(result);
        const ts = new Date().toLocaleString("en-PH", { timeZone: "Asia/Manila" });
        setSavedAtBasic(ts);
        const prev = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...prev, basic: { output: result, savedAt: ts } }));
      } else {
        const hasExtra = sellingPrice || cogs || shippingFee || rtsPercent;
        const extraData = hasExtra
          ? `Selling Price: P${sellingPrice || "not provided"}\nCOGS: P${cogs || "not provided"}\nShipping Fee: P${shippingFee || "not provided"}\nEstimated RTS %: ${rtsPercent || "not provided"}%`
          : "";
        const prompt = MODULE_PROMPTS.analyzeAdvanced(userCtx, extraData) + `\n\n# META ADS EXPORT DATA\n${csvText}`;
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt, systemPrompt: HILAS_KNOWLEDGE }),
        });
        const d = await res.json();
        const result = d.error ? `Error: ${d.error}` : d.content;
        setOutputAdvanced(result);
        const ts = new Date().toLocaleString("en-PH", { timeZone: "Asia/Manila" });
        setSavedAtAdvanced(ts);
        const prev = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...prev, advanced: { output: result, savedAt: ts } }));
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
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-gray-400 mb-4">Set up your business profile first.</p>
            <button onClick={() => router.push("/")} className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-lg text-sm font-medium">Go to Setup</button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto pt-14 md:pt-0">
        <div className="max-w-3xl mx-auto px-6 py-10">

          {/* Header */}
          <div className="mb-8">
            <div className="inline-flex items-center gap-2 bg-yellow-950 border border-yellow-800 rounded-full px-3 py-1 mb-4">
              <span className="text-yellow-300 text-xs font-medium">📊 Analyze</span>
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Analyze Your Ad Results</h1>
            <p className="text-gray-400 text-sm">Choose your analysis type below.</p>
          </div>

          {/* Mode selector */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <button
              onClick={() => setMode("basic")}
              className="rounded-xl border p-5 text-left transition-all"
              style={{
                background: mode === "basic" ? "#0F172A" : "#0A0F1A",
                borderColor: mode === "basic" ? "#2B7EC9" : "#1F2937",
                boxShadow: mode === "basic" ? "0 0 16px #2B7EC930" : "none",
              }}
            >
              <div className="text-2xl mb-2">📸</div>
              <p className="text-white font-bold text-sm mb-1">Basic Analysis</p>
              <p className="text-gray-500 text-xs">Messaging Ads — upload a screenshot</p>
            </button>
            <button
              onClick={() => setMode("advanced")}
              className="rounded-xl border p-5 text-left transition-all"
              style={{
                background: mode === "advanced" ? "#0F172A" : "#0A0F1A",
                borderColor: mode === "advanced" ? "#F5A623" : "#1F2937",
                boxShadow: mode === "advanced" ? "0 0 16px #F5A62330" : "none",
              }}
            >
              <div className="text-2xl mb-2">📄</div>
              <p className="text-white font-bold text-sm mb-1">Advanced Analysis</p>
              <p className="text-gray-500 text-xs">Purchase Ads — upload exported CSV</p>
            </button>
          </div>

          {/* BASIC MODE */}
          {mode === "basic" && (
            <>
              {/* Video guide */}
              <div className="rounded-xl border border-gray-700 overflow-hidden mb-6" style={{ background: "#0F172A" }}>
                <div className="px-4 py-3 flex items-center gap-2 border-b border-gray-800">
                  <span className="text-red-400 text-sm">▶</span>
                  <p className="text-white text-sm font-semibold">Watch before analyzing</p>
                  <span className="text-gray-600 text-xs ml-auto">Video guide</span>
                </div>
                <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
                  <iframe
                    src="https://www.loom.com/embed/33bbe4f3b6dc41de9d2487eace51e9e5"
                    allowFullScreen
                    className="absolute inset-0 w-full h-full"
                    style={{ border: "none" }}
                  />
                </div>
              </div>

              {/* Column instructions */}
              <div className="rounded-xl border border-blue-900 bg-blue-950/40 px-5 py-4 mb-6">
                <p className="text-blue-300 text-sm font-semibold mb-2">Before you screenshot — arrange your columns</p>
                <p className="text-gray-400 text-xs mb-3">Set your Ads Manager columns in this exact order:</p>
                <ol className="space-y-1 mb-3">
                  {BASIC_COLUMNS.map((col, i) => (
                    <li key={i} className="flex items-center gap-2 text-xs text-gray-300">
                      <span className="w-4 h-4 rounded-full flex items-center justify-center shrink-0 text-xs font-bold" style={{ background: "#1E3A5F", color: "#2B7EC9" }}>{i + 1}</span>
                      {col}
                    </li>
                  ))}
                </ol>
                <p className="text-gray-500 text-xs">Take a screenshot of that view, then upload below.</p>
              </div>

              {/* Upload */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-300 mb-2">Ads Manager Screenshot</label>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleImageUpload} />
                {screenshot ? (
                  <>
                    <div className="rounded-xl overflow-hidden border border-gray-700 mb-2">
                      <img src={screenshot} alt="screenshot" className="w-full object-contain max-h-72" />
                    </div>
                    <div className="flex gap-3 mt-2">
                      <button onClick={() => fileRef.current?.click()} className="text-xs text-blue-400 hover:text-blue-300">Replace</button>
                      <button onClick={() => setScreenshot(null)} className="text-xs text-red-400 hover:text-red-300">Remove</button>
                    </div>
                  </>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => fileRef.current?.click()} className="flex flex-col items-center gap-2 bg-gray-800 border border-dashed border-gray-600 rounded-xl p-5 text-center hover:border-blue-600 transition-colors">
                      <span className="text-2xl">🖼</span>
                      <p className="text-gray-300 text-sm font-medium">Upload Screenshot</p>
                      <p className="text-gray-600 text-xs">From your files</p>
                    </button>
                    <button onClick={() => cameraRef.current?.click()} className="flex flex-col items-center gap-2 bg-gray-800 border border-dashed border-gray-600 rounded-xl p-5 text-center hover:border-blue-600 transition-colors">
                      <span className="text-2xl">📷</span>
                      <p className="text-gray-300 text-sm font-medium">Take a Photo</p>
                      <p className="text-gray-600 text-xs">Use your camera</p>
                    </button>
                  </div>
                )}
              </div>

              {/* Basic profit fields */}
              <div className="border border-gray-700 rounded-xl p-5 mb-6" style={{ background: "#0F172A" }}>
                <p className="text-gray-400 text-xs font-medium uppercase tracking-wider mb-1">Optional — Profit & ROAS Calculator</p>
                <p className="text-gray-500 text-xs mb-4">Add these numbers to get profit per sale, ROAS, and break-even cost per message.</p>
                <div className="grid grid-cols-2 gap-4">
                  <PInput label="Selling Price (PHP)" value={productPrice} onChange={setProductPrice} placeholder="e.g. 499" />
                  <PInput label="Product Cost (PHP)" value={productCost} onChange={setProductCost} placeholder="e.g. 180" />
                  <PInput label="Amount Spent on Ads (PHP)" value={amountSpent} onChange={setAmountSpent} placeholder="e.g. 800" />
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">Number of Sales</label>
                    <input type="number" value={numSales} onChange={e => setNumSales(e.target.value)} placeholder="e.g. 5"
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg py-2.5 px-3 text-white placeholder-gray-600 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ADVANCED MODE */}
          {mode === "advanced" && (
            <>
              {/* Video guide */}
              <div className="rounded-xl border border-gray-700 overflow-hidden mb-6" style={{ background: "#0F172A" }}>
                <div className="px-4 py-3 flex items-center gap-2 border-b border-gray-800">
                  <span className="text-red-400 text-sm">▶</span>
                  <p className="text-white text-sm font-semibold">Watch before analyzing</p>
                  <span className="text-gray-600 text-xs ml-auto">Video guide</span>
                </div>
                <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
                  <iframe
                    src="https://www.loom.com/embed/a8bba8a865844adf90fd52c3d31cbc5c"
                    allowFullScreen
                    className="absolute inset-0 w-full h-full"
                    style={{ border: "none" }}
                  />
                </div>
              </div>

              {/* Column instructions */}
              <div className="rounded-xl border border-orange-900 bg-orange-950/30 px-5 py-4 mb-6">
                <p className="text-orange-300 text-sm font-semibold mb-2">Before you export — include these columns</p>
                <p className="text-gray-400 text-xs mb-3">In Ads Manager, customize columns to include these, then export as CSV:</p>
                <ol className="space-y-1 mb-3">
                  {ADVANCED_COLUMNS.map((col, i) => (
                    <li key={i} className="flex items-center gap-2 text-xs text-gray-300">
                      <span className="w-4 h-4 rounded-full flex items-center justify-center shrink-0 text-xs font-bold" style={{ background: "#431407", color: "#F5A623" }}>{i + 1}</span>
                      {col}
                    </li>
                  ))}
                </ol>
                <p className="text-gray-500 text-xs">Ads Manager → Export → Export Table Data (CSV)</p>
              </div>

              {/* CSV Upload */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-300 mb-2">Meta Ads Export File</label>
                <input ref={csvRef} type="file" accept=".csv" className="hidden" onChange={handleCsvUpload} />
                {csvText ? (
                  <div className="rounded-xl border border-gray-700 px-4 py-3 flex items-center justify-between" style={{ background: "#0F172A" }}>
                    <div className="flex items-center gap-3">
                      <span className="text-xl">📄</span>
                      <div>
                        <p className="text-white text-sm font-medium">{csvFileName}</p>
                        <p className="text-gray-500 text-xs">File loaded — ready to analyze</p>
                      </div>
                    </div>
                    <button onClick={() => { setCsvText(null); setCsvFileName(""); }} className="text-xs text-red-400 hover:text-red-300">Remove</button>
                  </div>
                ) : (
                  <button onClick={() => csvRef.current?.click()} className="w-full flex flex-col items-center gap-2 bg-gray-800 border border-dashed border-gray-600 rounded-xl p-8 text-center hover:border-orange-600 transition-colors">
                    <span className="text-3xl">📄</span>
                    <p className="text-gray-300 text-sm font-medium">Upload CSV Export</p>
                    <p className="text-gray-600 text-xs">CSV only — Export → Export Table Data (CSV)</p>
                  </button>
                )}
              </div>

              {/* Advanced profit fields */}
              <div className="border border-gray-700 rounded-xl p-5 mb-6" style={{ background: "#0F172A" }}>
                <p className="text-gray-400 text-xs font-medium uppercase tracking-wider mb-1">Optional — COD Profit Calculator</p>
                <p className="text-gray-500 text-xs mb-4">Include COGS, shipping, and RTS rate for a true net profit calculation.</p>
                <div className="grid grid-cols-2 gap-4">
                  <PInput label="Selling Price (PHP)" value={sellingPrice} onChange={setSellingPrice} placeholder="e.g. 599" />
                  <PInput label="COGS — Cost of Goods (PHP)" value={cogs} onChange={setCogs} placeholder="e.g. 150" />
                  <PInput label="Shipping Fee (PHP)" value={shippingFee} onChange={setShippingFee} placeholder="e.g. 80" />
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">Estimated RTS % (Return to Sender)</label>
                    <div className="relative">
                      <input type="number" value={rtsPercent} onChange={e => setRtsPercent(e.target.value)} placeholder="e.g. 20"
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg py-2.5 pl-3 pr-7 text-white placeholder-gray-600 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
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
              style={{ background: mode === "advanced" ? "#F5A623" : "#2B7EC9", color: mode === "advanced" ? "#000" : "#fff" }}
            >
              {loading ? "Analyzing..." : mode === "advanced" ? "Run Advanced Analysis" : "Analyze My Results"}
            </button>
          )}

          {/* Last saved indicator */}
          {savedAt && !loading && output && (
            <div className="flex items-center justify-between mb-3">
              <p className="text-gray-600 text-xs">
                Last analysis: <span className="text-gray-500">{savedAt}</span> · <span className="text-gray-500 uppercase text-xs">{mode === "advanced" ? "Advanced" : "Basic"}</span>
              </p>
              <button
                onClick={() => {
                  if (mode === "advanced") { setOutputAdvanced(""); setSavedAtAdvanced(null); }
                  else { setOutputBasic(""); setSavedAtBasic(null); }
                  const prev = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
                  if (mode === "advanced") delete prev.advanced; else delete prev.basic;
                  localStorage.setItem(STORAGE_KEY, JSON.stringify(prev));
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
                    className="text-xs px-3 py-1 rounded-lg border border-gray-700 hover:border-gray-500 text-gray-400 hover:text-white transition-colors"
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
                className="flex-1 py-3 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 border border-gray-700 hover:border-blue-500 transition-colors"
                style={{ background: "#0F172A", color: "#fff" }}
              >
                <span>🖥️</span> HTML Deck
              </button>
              <button
                onClick={() => setShowReport(true)}
                className="flex-1 py-3 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 border border-gray-700 hover:border-gray-500 transition-colors"
                style={{ background: "#0F172A", color: "#fff" }}
              >
                <span>📄</span> PDF Report
              </button>
            </div>
          )}

          {/* Report Modal */}
          {showReport && (
            <div className="fixed inset-0 z-50 bg-black/80 flex flex-col" style={{ overflow: "hidden" }}>
              {/* Sticky toolbar */}
              <div className="shrink-0 flex items-center justify-between px-5 py-3 border-b border-gray-700" style={{ background: "#0A0F1A" }}>
                <p className="text-white text-sm font-semibold">Report Preview</p>
                <div className="flex gap-3 items-center">
                  <button
                    onClick={downloadPDF}
                    className="px-4 py-2 rounded-lg text-sm font-semibold"
                    style={{ background: "#2B7EC9", color: "#fff" }}
                  >
                    Download PDF
                  </button>
                  <button onClick={() => setShowReport(false)} className="text-gray-400 hover:text-white text-xl px-2 leading-none">✕</button>
                </div>
              </div>

              {/* Scrollable report content */}
              <div className="flex-1 overflow-y-auto p-6 flex justify-center">
                <div ref={reportRef} style={{ background: "#fff", padding: "48px", fontFamily: "Georgia, serif", color: "#111", borderRadius: "8px", width: "100%", maxWidth: "720px" }}>
                  {/* Header */}
                  <div style={{ borderBottom: "3px solid #2B7EC9", paddingBottom: "20px", marginBottom: "32px", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                    <div>
                      <div style={{ fontSize: "24px", fontWeight: "bold", color: "#111", fontFamily: "Arial, sans-serif" }}>{userName}</div>
                      <div style={{ fontSize: "12px", color: "#6B7280", fontFamily: "Arial, sans-serif", marginTop: "2px" }}>Meta Ads Analysis Report</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: "11px", color: "#6B7280", fontFamily: "Arial, sans-serif" }}>{savedAt}</div>
                      <div style={{ fontSize: "11px", color: "#6B7280", fontFamily: "Arial, sans-serif", textTransform: "uppercase", letterSpacing: "0.05em" }}>{mode === "advanced" ? "Advanced Analysis" : "Basic Analysis"}</div>
                    </div>
                  </div>

                  {/* Structured content */}
                  <div style={{ fontFamily: "Arial, sans-serif" }}>
                    {output.split("\n").map((line, i) => {
                      const t = line.trim();
                      if (!t || t === "---" || t === "***") return <div key={i} style={{ height: "8px" }} />;
                      if (t.startsWith("## ")) return (
                        <div key={i} style={{ fontSize: "13px", fontWeight: "bold", color: "#2B7EC9", textTransform: "uppercase", letterSpacing: "0.08em", marginTop: "28px", marginBottom: "10px", borderBottom: "1px solid #E5E7EB", paddingBottom: "6px" }}>
                          {t.slice(3)}
                        </div>
                      );
                      if (t.startsWith("# ")) return (
                        <div key={i} style={{ fontSize: "18px", fontWeight: "bold", color: "#111", marginTop: "16px", marginBottom: "8px" }}>
                          {t.slice(2)}
                        </div>
                      );
                      if (t.startsWith("- ") || t.startsWith("* ")) {
                        const text = t.slice(2).replace(/\*\*(.*?)\*\*/g, "$1").replace(/🟢/g, "✓").replace(/🟡/g, "~").replace(/🔴/g, "✗");
                        return (
                          <div key={i} style={{ display: "flex", gap: "10px", marginBottom: "6px", alignItems: "flex-start" }}>
                            <span style={{ color: "#2B7EC9", fontWeight: "bold", fontSize: "14px", lineHeight: "1.6", flexShrink: 0 }}>•</span>
                            <span style={{ fontSize: "13px", lineHeight: "1.7", color: "#1F2937" }}>{text}</span>
                          </div>
                        );
                      }
                      const plain = t.replace(/\*\*(.*?)\*\*/g, "$1").replace(/🟢/g, "✓").replace(/🟡/g, "~").replace(/🔴/g, "✗");
                      return (
                        <p key={i} style={{ fontSize: "13px", lineHeight: "1.8", color: "#374151", marginBottom: "6px" }}>{plain}</p>
                      );
                    })}
                  </div>

                  {/* Footer */}
                  <div style={{ borderTop: "1px solid #E5E7EB", marginTop: "40px", paddingTop: "14px", fontSize: "10px", color: "#9CA3AF", fontFamily: "Arial, sans-serif", display: "flex", justifyContent: "space-between" }}>
                    <span>Generated by {userName}</span>
                    <span>{savedAt}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
