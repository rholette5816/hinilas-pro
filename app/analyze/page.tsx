"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import AIOutput from "@/components/AIOutput";
import { useApp, buildUserContext } from "@/lib/context";
import { MODULE_PROMPTS, HILAS_KNOWLEDGE } from "@/lib/knowledge";

export default function AnalyzePage() {
  const { setup } = useApp();
  const router = useRouter();
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [productPrice, setProductPrice] = useState("");
  const [productCost, setProductCost] = useState("");
  const [amountSpent, setAmountSpent] = useState("");
  const [numSales, setNumSales] = useState("");
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
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

  async function analyze() {
    if (!setup || !screenshot) return;
    setLoading(true);
    setOutput("");

    const userCtx = buildUserContext(setup);
    const hasProfit = productPrice || productCost || amountSpent || numSales;
    const profitInfo = hasProfit
      ? `\nProduct Selling Price: P${productPrice || "not provided"}\nProduct Cost: P${productCost || "not provided"}\nAmount Spent on Ads: P${amountSpent || "not provided"}\nNumber of Sales / Conversions: ${numSales || "not provided"}`
      : "";
    const prompt = MODULE_PROMPTS.analyze(userCtx, profitInfo);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          systemPrompt: HILAS_KNOWLEDGE,
          images: [screenshot],
        }),
      });
      const d = await res.json();
      setOutput(d.error ? `Error: ${d.error}` : d.content);
    } catch {
      setOutput("Something went wrong. Try again.");
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
            <p className="text-gray-400 text-sm">Upload a screenshot of your Ads Manager. AI reads the numbers and gives you a full diagnosis.</p>
          </div>

          {/* Video instruction */}
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

          {/* Column setup instructions */}
          <div className="rounded-xl border border-blue-900 bg-blue-950/40 px-5 py-4 mb-6">
            <p className="text-blue-300 text-sm font-semibold mb-2">Before you screenshot — arrange your columns</p>
            <p className="text-gray-400 text-xs mb-3">Set your Ads Manager columns in this exact order for the most accurate analysis:</p>
            <ol className="space-y-1 mb-3">
              {[
                "Conversations Started",
                "Cost per Messaging Conversation",
                "Amount Spent",
                "CTR (Link Click-Through Rate)",
                "CPC (Cost per Link Click)",
                "CPM (Cost per 1,000 Impressions)",
                "Frequency",
              ].map((col, i) => (
                <li key={i} className="flex items-center gap-2 text-xs text-gray-300">
                  <span className="w-4 h-4 rounded-full flex items-center justify-center shrink-0 text-xs font-bold" style={{ background: "#1E3A5F", color: "#2B7EC9" }}>{i + 1}</span>
                  {col}
                </li>
              ))}
            </ol>
            <p className="text-gray-500 text-xs">Take a screenshot of that view, then upload it below.</p>
          </div>

          {/* Screenshot upload */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-300 mb-2">Ads Manager Screenshot</label>

            {/* Hidden file inputs */}
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
            <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleUpload} />

            {screenshot ? (
              <>
                <div className="rounded-xl overflow-hidden border border-gray-700 mb-2">
                  <img src={screenshot} alt="Ads Manager screenshot" className="w-full object-contain max-h-72" />
                </div>
                <div className="flex items-center gap-3 mt-2">
                  <button onClick={() => fileRef.current?.click()} className="text-xs text-blue-400 hover:text-blue-300">
                    Replace image
                  </button>
                  <button onClick={() => setScreenshot(null)} className="text-xs text-red-400 hover:text-red-300">
                    Remove
                  </button>
                </div>
              </>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => fileRef.current?.click()}
                  className="flex flex-col items-center gap-2 bg-gray-800 border border-dashed border-gray-600 rounded-xl p-5 text-center hover:border-blue-600 hover:bg-gray-700 transition-colors"
                >
                  <span className="text-2xl">🖼</span>
                  <p className="text-gray-300 text-sm font-medium">Upload Screenshot</p>
                  <p className="text-gray-600 text-xs">From your files</p>
                </button>
                <button
                  onClick={() => cameraRef.current?.click()}
                  className="flex flex-col items-center gap-2 bg-gray-800 border border-dashed border-gray-600 rounded-xl p-5 text-center hover:border-blue-600 hover:bg-gray-700 transition-colors"
                >
                  <span className="text-2xl">📷</span>
                  <p className="text-gray-300 text-sm font-medium">Take a Photo</p>
                  <p className="text-gray-600 text-xs">Use your camera</p>
                </button>
              </div>
            )}
          </div>

          {/* Profit & ROAS Calculator */}
          <div className="border border-gray-700 rounded-xl p-5 mb-6" style={{ background: "#0F172A" }}>
            <p className="text-gray-400 text-xs font-medium uppercase tracking-wider mb-1">Optional — Profit & ROAS Calculator</p>
            <p className="text-gray-500 text-xs mb-4">Add these numbers to get profit per sale, ROAS, and break-even cost per message.</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Selling Price (PHP)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">P</span>
                  <input
                    type="number"
                    value={productPrice}
                    onChange={e => setProductPrice(e.target.value)}
                    placeholder="e.g. 499"
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg py-2.5 pl-7 pr-3 text-white placeholder-gray-600 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Product Cost (PHP)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">P</span>
                  <input
                    type="number"
                    value={productCost}
                    onChange={e => setProductCost(e.target.value)}
                    placeholder="e.g. 180"
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg py-2.5 pl-7 pr-3 text-white placeholder-gray-600 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Amount Spent on Ads (PHP)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">P</span>
                  <input
                    type="number"
                    value={amountSpent}
                    onChange={e => setAmountSpent(e.target.value)}
                    placeholder="e.g. 800"
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg py-2.5 pl-7 pr-3 text-white placeholder-gray-600 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Number of Sales</label>
                <input
                  type="number"
                  value={numSales}
                  onChange={e => setNumSales(e.target.value)}
                  placeholder="e.g. 5"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg py-2.5 px-3 text-white placeholder-gray-600 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Action */}
          <button
            onClick={analyze}
            disabled={loading || !screenshot}
            className="w-full text-white py-3 rounded-lg text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-40 mb-6"
            style={{ background: "#2B7EC9" }}
          >
            {loading ? "Analyzing..." : "Analyze My Results"}
          </button>

          {/* Output */}
          <AIOutput content={output} loading={loading} loadingText="Reading your screenshot and diagnosing results..." />

        </div>
      </main>
    </div>
  );
}
